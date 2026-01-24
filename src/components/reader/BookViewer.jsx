import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, ZoomIn, ZoomOut, PenTool, X, Trash2, CheckCircle2 } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

// Hooks & Components
import { useSmartTrigger } from '../../hooks/useSmartTrigger';
import CheckpointPrompt from '../overlays/CheckpointPrompt';
import ActivityOverlay from '../overlays/ActivityOverlay';
import LoadingOverlay from '../overlays/LoadingOverlay';

// Services
import { extractTextFromRange, getPageAsImage } from '../../services/pdfHelper';
import { parsePdf } from '../../services/bookParser';
import { generateActivities } from '../../services/aiFactory';
import { generateImageBackground } from '../../services/imageGenService';
import useSettingsStore from '../../store/useSettingsStore';

import { analyzeTextStructure, getPdfOutline } from '../../services/structureService';

// Worker Config
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const BookViewer = () => {
  const { activeBook, updateBookProgress, setScreen, toggleActivity, addHighlight, highlights, deleteHighlight, isActivityOpen } = useAppStore();

  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [activityData, setActivityData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isScrubbing, setIsScrubbing] = useState(false); // Track if user is dragging slider

  // Tools State
  const [selection, setSelection] = useState(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const canvasRef = useRef(null);
  const pageContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Settings
  const manualChapterMode = useSettingsStore(s => s.manualChapterMode);
  const enablePeriodicCheckpoints = useSettingsStore(s => s.enablePeriodicCheckpoints);



  // --- 1. SETUP URL (Cloud vs Local) ---
  useEffect(() => {
    if (!activeBook) { setScreen('DASHBOARD'); return; }

    const initBook = async () => {
      let url = null;
      let blob = activeBook.fileData;

      // Blob Logic
      if (activeBook.type === 'CLOUD') {
        setPdfUrl(activeBook.url);
        // Fetch blob for analysis if needed (though we try to avoid big fetches if not needed)
        // For structure analysis, we need the blob. 
        // If we don't have it, we might skip or fetch.
      } else if (activeBook.fileData) {
        if (activeBook.fileData instanceof Blob) {
          url = URL.createObjectURL(activeBook.fileData);
          setPdfUrl(url);
        }
      }

      // --- SMART NAVIGATION LOGIC ---
      // If we have a blob and NO structure yet, analyze it.
      if (blob && !activeBook.structure && activeBook.progress <= 1) {
        console.log("🔍 Analyzing Book Structure...");
        // 1. Check Outline
        let structure = await getPdfOutline(blob);

        // 2. Fallback to AI Index Analysis (Text only)
        if (!structure) {
          structure = await analyzeTextStructure(blob);
        }

        if (structure && structure.startPage) {
          console.log("📍 Smart Start: Jumping to page", structure.startPage);
          // Simple Alert/Toast could go here
          // Jump to Start Page
          updateBookProgress(structure.startPage, numPages);
          // TODO: Save 'structure' to Store so we don't run this again
        }
      }
    };

    initBook();

    return () => {
      // Cleanup URL
    };
  }, [activeBook]);

  const currentPage = activeBook?.progress || 1;

  // --- RESET ON PAGE TURN ---
  useEffect(() => {
    setIsPromptDismissed(false);
    setSelection(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [currentPage]);

  const triggerState = useSmartTrigger(currentPage, numPages);

  // --- HIGHLIGHTER & DRAWING ---
  useEffect(() => {
    const handleSelection = () => {
      if (isDrawMode) return;
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        setSelection({ text: sel.toString(), rawRange: sel.getRangeAt(0) });
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => { document.removeEventListener('selectionchange', handleSelection); };
  }, [isDrawMode]);

  const saveHighlight = (color) => {
    if (selection && selection.rawRange && pageContainerRef.current) {
      const pageRect = pageContainerRef.current.getBoundingClientRect();
      const selRect = selection.rawRange.getBoundingClientRect();
      const relativeRect = {
        top: ((selRect.top - pageRect.top) / pageRect.height) * 100,
        left: ((selRect.left - pageRect.left) / pageRect.width) * 100,
        width: (selRect.width / pageRect.width) * 100,
        height: (selRect.height / pageRect.height) * 100,
      };
      addHighlight(selection.text, color, currentPage, activeBook.id, relativeRect);
      setSelection(null);
      window.getSelection().removeAllRanges();
    }
  };

  const startDrawing = (e) => {
    if (!isDrawMode) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const getPos = (evt) => {
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const start = getPos(e.nativeEvent || e);
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = 'red';
    ctx.beginPath(); ctx.moveTo(start.x, start.y);
    const draw = (moveEvent) => {
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const pos = getPos(moveEvent);
      ctx.lineTo(pos.x, pos.y); ctx.stroke();
    };
    const stop = () => {
      canvas.removeEventListener('mousemove', draw); canvas.removeEventListener('mouseup', stop);
      canvas.removeEventListener('touchmove', draw); canvas.removeEventListener('touchend', stop);
    };
    canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('touchmove', draw, { passive: false }); canvas.addEventListener('touchend', stop);
  };

  // --- SLIDER HANDLER ---
  const handleSliderChange = (e) => {
    setIsScrubbing(true);
    updateBookProgress(parseInt(e.target.value), numPages);
  };

  const handleSliderCommit = (e) => {
    setIsScrubbing(false);
    updateBookProgress(parseInt(e.target.value), numPages);
  };

  // --- SMART AI HANDLER (VISION + TEXT) ---
  const handleStartActivity = async (triggerType = 'MICRO') => {
    toggleActivity(true);
    setIsGenerating(true);

    try {
      let fileToRead = activeBook.fileData;

      if (!fileToRead && activeBook.url) {
        try {
          const resp = await fetch(activeBook.url);
          fileToRead = await resp.blob();
        } catch (e) {
          console.error("Failed to fetch cloud PDF for analysis", e);
          throw new Error("Could not access cloud file.");
        }
      }
      if (!fileToRead) throw new Error("No file content found.");

      const settings = useSettingsStore.getState();

      // --- CONTEXT STRATEGY LOGIC ---
      let limit = 5; // Fallback

      // 1. Determine Context Limit based on Type & Source
      if (triggerType === 'CHAPTER_END') {
        limit = settings.chapterContextLimit || 15;
      } else {
        // For Checkpoints (Micro)
        // Default to Text Limit if Scanned is undefined, but check explicitly for boolean true
        const isScanned = activeBook.isScanned === true;
        limit = isScanned ? (settings.scannedContextLimit || 3) : (settings.textContextLimit || 5);
      }

      // Safety check for limit
      if (!limit || typeof limit !== 'number' || limit < 1) {
        console.warn("⚠️ Invalid context limit detected:", limit, "Resetting to 5.");
        limit = 5;
      }

      console.log(`🧠 Generating Activity (${triggerType}) with context: ${limit} pages. (Scanned: ${activeBook.isScanned})`);

      // STEP 1: Smart Parse (Returns { mode, data })
      // Request specific page range based on limit
      const startPage = Math.max(1, currentPage - limit + 1);
      const parsedInput = await parsePdf(fileToRead, startPage, currentPage);

      if (!parsedInput || !parsedInput.data) {
        throw new Error("Could not extract content from this page.");
      }

      // STEP 2: Send to AI Factory (Gemini 2.5 Flash)
      const aiData = await generateActivities(
        parsedInput,
        triggerType || 'MICRO'
      );

      if (aiData) {
        setActivityData(aiData);
        setIsGenerating(false);

        // --- NEW: AUTO-SAVE ALL GENERATED CONTENT ---
        const bookId = activeBook.id.toString();
        const itemsToSave = [];

        // Save Quizzes
        if (aiData.quiz && Array.isArray(aiData.quiz)) {
          aiData.quiz.forEach(q => itemsToSave.push({ ...q, bookId }));
        }

        // Save Concept Map
        if (aiData.concept_map) {
          itemsToSave.push({ ...aiData.concept_map, bookId });
        }

        // Batch Save
        if (itemsToSave.length > 0) {
          useAppStore.getState().addMultipleFavorites(itemsToSave);
          console.log(`💾 Auto-saved ${itemsToSave.length} activities to notebook.`);
        }
        // --------------------------------------------

        // STEP 3: Background Image Generation
        const visualTask = aiData.quiz?.find(q => q.type === 'visual');
        const settings = useSettingsStore.getState();

        if (visualTask && visualTask.image_prompt && settings.imageGenProvider !== 'NONE') {
          const prompt = visualTask.image_prompt;
          const imageId = Date.now().toString();

          console.log("🎨 Starting Background Generation for:", prompt);

          useAppStore.getState().addToGallery({
            id: imageId, bookId: activeBook.id, timestamp: Date.now(), prompt: prompt, url: null, status: 'pending'
          });

          generateImageBackground(prompt)
            .then((url) => {
              console.log("🎨 Background Gen Complete:", url);
              useAppStore.getState().updateGalleryImage(imageId, url, 'success');
            })
            .catch((err) => {
              console.error("🎨 Background Gen Failed:", err);
              useAppStore.getState().updateGalleryImage(imageId, null, 'error');
            });
        }
      } else {
        toggleActivity(false);
        alert("AI failed to read this page. Please try another page.");
      }

    } catch (error) {
      console.error(error);
      toggleActivity(false);
      alert("Error generating activity. Check internet connection.");
    } finally {
      if (!activityData) setIsGenerating(false);
    }
  };

  if (!activeBook) return <div>Loading...</div>;
  const pageHighlights = highlights.filter(h => h.bookId === activeBook.id && h.page === currentPage);
  const pdfWidth = window.innerWidth > 800 ? 600 : window.innerWidth - 32;

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-2 md:px-3 py-2 flex justify-between items-center z-20 shrink-0 shadow-sm h-12 md:h-14">
        <button onClick={() => setScreen('DASHBOARD')} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full text-gray-700"><ArrowLeft size={20} /></button>
        <div className="font-bold text-gray-800 truncate text-sm max-w-[100px] xs:max-w-[140px] md:max-w-md flex-1 mx-2">{activeBook.title}</div>
        <div className="flex items-center gap-0.5 md:gap-1">
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.6))} className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded-full"><ZoomOut size={18} /></button>
          <span className="text-xs font-mono w-8 text-center hidden md:inline-block">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 2.5))} className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded-full"><ZoomIn size={18} /></button>
          <div className="w-[1px] h-5 md:h-6 bg-gray-300 mx-1"></div>
          <button onClick={() => setIsDrawMode(!isDrawMode)} className={`p-1.5 md:p-2 rounded-full transition ${isDrawMode ? 'bg-red-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>{isDrawMode ? <X size={18} /> : <PenTool size={18} />}</button>
        </div>
      </div>

      {/* PDF VIEWER */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-gray-200 relative flex justify-center p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="relative shadow-xl transition-all duration-200 origin-top" style={{ width: 'fit-content', height: 'fit-content' }}>
          <div ref={pageContainerRef} className="relative bg-white min-h-[500px]">

            {pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); if (!activeBook.totalPages) updateBookProgress(currentPage, numPages); }}
                loading={<div className="h-96 flex flex-col items-center justify-center text-gray-500"><Loader2 className="animate-spin mb-2" size={40} /><p className="font-bold text-sm">Loading Book...</p></div>}
                error={<div className="h-96 flex items-center justify-center text-red-500 p-8 text-center font-bold">Failed to load PDF.</div>}
              >
                <Page pageNumber={currentPage} scale={scale} renderTextLayer={!isDrawMode} renderAnnotationLayer={false} width={pdfWidth} />
              </Document>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-gray-500"><Loader2 className="animate-spin mb-2" size={40} /><p className="font-bold text-sm">Preparing...</p></div>
            )}

            {pageHighlights.map((h) => (h.rect && (<div key={h.id} className="absolute cursor-pointer group" style={{ top: `${h.rect.top}%`, left: `${h.rect.left}%`, width: `${h.rect.width}%`, height: `${h.rect.height}%`, backgroundColor: h.color, opacity: 0.4, mixBlendMode: 'multiply' }} onClick={(e) => { e.stopPropagation(); deleteHighlight(h.id); }}><button className="hidden md:block group-hover:flex absolute -top-4 -right-4 bg-red-500 text-white p-1 rounded-full shadow-sm z-10 scale-[0.6]"><Trash2 size={16} /></button></div>)))}
            {isDrawMode && <canvas ref={canvasRef} className="absolute inset-0 z-50 cursor-crosshair touch-none" width={pdfWidth * scale} height={1200 * scale} onMouseDown={startDrawing} onTouchStart={startDrawing} />}
          </div>
        </div>
      </div>

      {/* FOOTER CONTROLS & SLIDER */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex flex-col gap-3 shrink-0 z-20">

        {/* Page Scroller Slider */}
        {numPages > 1 && (
          <div className="flex items-center gap-3 px-2">
            <span className="text-xs font-mono text-gray-400">1</span>
            <input
              type="range"
              min="1"
              max={numPages}
              value={currentPage}
              onChange={handleSliderChange}
              onMouseUp={handleSliderCommit}
              onTouchEnd={handleSliderCommit}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-xs font-mono text-gray-400">{numPages}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button onClick={() => updateBookProgress(currentPage - 1, numPages)} disabled={currentPage <= 1} className="flex items-center gap-1 text-gray-700 disabled:opacity-30 px-4 py-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /> <span className="hidden md:inline font-bold">Prev</span></button>
          <span className="font-mono text-sm font-bold bg-gray-100 px-4 py-1 rounded-full">{currentPage} / {numPages || '--'}</span>
          <button onClick={() => updateBookProgress(currentPage + 1, numPages)} disabled={currentPage >= numPages} className="flex items-center gap-1 text-gray-700 disabled:opacity-30 px-4 py-2 hover:bg-gray-100 rounded-lg"><span className="hidden md:inline font-bold">Next</span> <ChevronRight size={20} /></button>
        </div>

        {/* Manual Chapter Finish Button */}
        {manualChapterMode && (
          <button
            onClick={() => handleStartActivity('CHAPTER_END')}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition flex justify-center items-center gap-2"
          >
            <CheckCircle2 size={18} /> Finish Chapter & Quiz
          </button>
        )}
      </div>

      {selection && !isDrawMode && (<div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-xl z-[60] animate-in slide-in-from-bottom flex flex-col gap-3"><div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase">Save Highlight</span><button onClick={() => { setSelection(null); window.getSelection().removeAllRanges(); }} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button></div><div className="flex justify-between gap-3">{['#fff59d', '#a5d6a7', '#90caf9', '#ef9a9a'].map(color => (<button key={color} onClick={() => saveHighlight(color)} className="flex-1 h-12 rounded-xl border-2 border-transparent transition shadow-sm" style={{ backgroundColor: color }} />))}</div></div>)}

      {/* Auto-Prompt Logic */}
      {!isPromptDismissed && !isGenerating && !activityData && !isScrubbing && triggerState.show && (
        (triggerState.type === 'CHAPTER_END' && !manualChapterMode) ||
        (triggerState.type !== 'CHAPTER_END' && enablePeriodicCheckpoints)
      ) && (
          <CheckpointPrompt
            show={true}
            page={currentPage}
            onStartActivity={() => handleStartActivity(triggerState.type)}
            onSkip={() => setIsPromptDismissed(true)}
          />
        )}

      {isGenerating && <LoadingOverlay />}
      {/* ACTIVITY OVERLAY */}
      {isActivityOpen && activityData && (
        <ActivityOverlay
          data={activityData}
          bookId={activeBook.id}
          onClose={() => { setActivityData(null); toggleActivity(false); }}
        />
      )}
    </div>
  );
};

export default BookViewer;