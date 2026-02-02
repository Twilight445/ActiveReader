import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, ZoomIn, ZoomOut, PenTool, X, Trash2, CheckCircle2, UploadCloud, BookOpen, Moon, Sun, List } from 'lucide-react';
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

// Zen Reader
import ZenControls from './ZenControls';
import '../../styles/ReaderThemes.css';

const BookViewer = () => {
  const { activeBook, updateBookProgress, setScreen, toggleActivity, addHighlight, highlights, deleteHighlight, isActivityOpen } = useAppStore();
  /* Removed duplicate destructuring */

  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [activityData, setActivityData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isScrubbing, setIsScrubbing] = useState(false); // Track if user is dragging slider
  const [generationMode, setGenerationMode] = useState(null); // 'FOREGROUND' or 'BACKGROUND'

  // Tools State
  const [selection, setSelection] = useState(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const canvasRef = useRef(null);
  const pageContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Dictionary State
  const [dictionaryData, setDictionaryData] = useState(null);

  const handleDefine = async () => {
    if (!selection?.text) return;
    const word = selection.text.trim();
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await res.json();
      if (Array.isArray(data)) setDictionaryData(data[0]);
      else setDictionaryData({ word, meanings: [] });
    } catch (e) {
      setDictionaryData({ word, meanings: [] });
    }
    setSelection(null);
    window.getSelection().removeAllRanges();
  };

  // Settings
  const manualChapterMode = useSettingsStore(s => s.manualChapterMode);
  const enablePeriodicCheckpoints = useSettingsStore(s => s.enablePeriodicCheckpoints);
  const readerDarkMode = useSettingsStore(s => s.readerDarkMode);
  const toggleReaderDarkMode = useSettingsStore(s => s.toggleReaderDarkMode);

  // Zen Reader Settings
  const zenMode = useSettingsStore(s => s.zenMode);
  const readerTheme = useSettingsStore(s => s.readerTheme);
  const readerFont = useSettingsStore(s => s.readerFont);
  const fontSize = useSettingsStore(s => s.fontSize);
  const marginSize = useSettingsStore(s => s.marginSize);

  // Zen Controls State
  const [showZenControls, setShowZenControls] = useState(false);




  // --- GLOBAL DARK MODE EFFECT ---
  useEffect(() => {
    if (readerDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [readerDarkMode]);

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
  const handleStartActivity = async (triggerType = 'MICRO', background = false) => {
    // Mode must be set BEFORE isGenerating to avoid UI flash
    setGenerationMode(background ? 'BACKGROUND' : 'FOREGROUND');

    // CRITICAL: Explicitly control overlay - CLOSE in background, OPEN in foreground
    if (background) {
      toggleActivity(false); // Ensure overlay is closed for background processing
    } else {
      toggleActivity(true); // Open overlay for foreground processing
    }

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

      // Check for errors
      if (!parsedInput || parsedInput.mode === 'ERROR' || !parsedInput.data) {
        console.error("❌ PDF parsing failed or returned no data");
        throw new Error("Could not extract content from this page. The PDF may be corrupted or the page may be unreadable.");
      }

      console.log(`✅ Parsed PDF in ${parsedInput.mode} mode with ${Array.isArray(parsedInput.data) ? parsedInput.data.length + ' images' : 'text'}`);

      // STEP 2: Send to AI Factory
      const aiData = await generateActivities(
        parsedInput,
        triggerType || 'MICRO'
      );

      if (aiData) {
        setActivityData(aiData);
        // REMOVED: setIsGenerating(false); - Let finally block handle this

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
      // Always reset generating state after completion
      setIsGenerating(false);
      // Don't reset generationMode here - keep it so CheckpointPrompt knows to show "Open Activities"
    }
  };

  if (!activeBook) return <div>Loading...</div>;
  const pageHighlights = highlights.filter(h => h.bookId === activeBook.id && h.page === currentPage);
  const pdfWidth = window.innerWidth > 800 ? 600 : window.innerWidth - 32;

  // Get theme background color for container
  const getThemeBg = () => {
    switch (readerTheme) {
      case 'dark': return 'bg-[#1C1C1E]';
      case 'sepia': return 'bg-[#F4ECD8]';
      case 'night': return 'bg-[#1A1612]';
      default: return 'bg-[#FAFAF8]';
    }
  };

  // Get font class
  const getFontClass = () => {
    switch (readerFont) {
      case 'Georgia': return 'font-georgia';
      case 'OpenDyslexic': return 'font-dyslexic';
      case 'System': return 'font-system';
      default: return 'font-literata';
    }
  };

  // --- ZEN MODE CLICK HANDLER (Event Delegation) ---
  const handleZenClick = (e) => {
    // 1. If not in Zen Mode, do nothing (let default events happen)
    if (!zenMode) return;

    // 2. Ignore clicks on interactive elements (buttons, inputs, links, etc.)
    const target = e.target;
    if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('.interactive')) {
      return;
    }

    // 3. Ignore if user is selecting text (selection is not empty)
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }

    // 4. Calculate Tap Position
    const width = window.innerWidth;
    const x = e.clientX;

    // LEFT ZONE (0% - 20%) -> Previous Page
    if (x < width * 0.2) {
      if (currentPage > 1) updateBookProgress(currentPage - 1, numPages);
    }
    // RIGHT ZONE (80% - 100%) -> Next Page
    else if (x > width * 0.8) {
      if (currentPage < numPages) updateBookProgress(currentPage + 1, numPages);
    }
    // CENTER ZONE (20% - 80%) -> Toggle Controls
    else {
      setShowZenControls(!showZenControls);
    }
  };

  return (
    <div
      className={`zen-reader h-screen w-screen flex flex-col overflow-hidden theme-${readerTheme} ${getFontClass()}`}
      onClick={handleZenClick}
    >

      {/* HEADER - Only shown when NOT in Zen mode */}
      {!zenMode && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 md:px-3 py-2 flex justify-between items-center z-20 shrink-0 shadow-sm h-12 md:h-14">
          <button onClick={() => setScreen('DASHBOARD')} className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-gray-200 transition-colors"><ArrowLeft size={20} /></button>
          <div className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm max-w-[100px] xs:max-w-[140px] md:max-w-md flex-1 mx-2">{activeBook.title}</div>
          <div className="flex items-center gap-0.5 md:gap-1">
            <button onClick={() => setScale(s => Math.max(s - 0.2, 0.6))} className="p-1.5 md:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><ZoomOut size={18} /></button>
            <span className="text-xs font-mono w-8 text-center hidden md:inline-block text-gray-600 dark:text-gray-300">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(s + 0.2, 2.5))} className="p-1.5 md:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><ZoomIn size={18} /></button>
            <div className="w-[1px] h-5 md:h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleReaderDarkMode}
              className={`p-1.5 md:p-2 rounded-full transition ${readerDarkMode ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title={readerDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {readerDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setIsDrawMode(!isDrawMode)} className={`p-1.5 md:p-2 rounded-full transition ${isDrawMode ? 'bg-red-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{isDrawMode ? <X size={18} /> : <PenTool size={18} />}</button>
          </div>
        </div>
      )}



      {/* TAP ZONES - Removed to prevent blocking text selection. Using event delegation instead. */}

      <div className="flex-1 flex items-start justify-center overflow-auto py-4">
        <div className="relative shadow-xl transition-all duration-200 origin-top" style={{ width: 'fit-content', height: 'fit-content' }}>

          {/* BOOKMARK RIBBON */}
          {useAppStore(s => s.bookmarks).some(b => b.bookId === activeBook.id && b.page === currentPage) && (
            <div className="bookmark-indicator visible" />
          )}

          <div
            ref={pageContainerRef}
            className="relative min-h-[500px] transition-all duration-300 zen-page"
            style={readerTheme === 'dark' || readerTheme === 'night' ? {
              filter: 'invert(0.88) hue-rotate(180deg)',
              background: readerTheme === 'dark' ? '#1C1C1E' : '#1A1612'
            } : { background: readerTheme === 'sepia' ? '#F4ECD8' : 'white' }}
          >

            {pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); if (!activeBook.totalPages) updateBookProgress(currentPage, numPages); }}
                // ... (keep existing loaders)
                loading={<div className="h-96 flex flex-col items-center justify-center text-gray-500"><Loader2 className="animate-spin mb-2" size={40} /><p className="font-bold text-sm">Loading Book...</p></div>}
                error={<div className="h-96 flex items-center justify-center text-red-500 p-8 text-center font-bold">Failed to load PDF.</div>}
              >
                <Page pageNumber={currentPage} scale={scale} renderTextLayer={!isDrawMode} renderAnnotationLayer={false} width={pdfWidth} />

                {/* AGGRESSIVE PRELOADING (Keep existing) */}
                {currentPage < numPages && (
                  <div style={{ display: 'none' }} aria-hidden="true">
                    <Page pageNumber={currentPage + 1} scale={scale * 0.75} renderTextLayer={false} renderAnnotationLayer={false} width={pdfWidth * 0.75} />
                  </div>
                )}
                {/* ... (keep other preloads) ... */}
              </Document>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-gray-500"><Loader2 className="animate-spin mb-2" size={40} /><p className="font-bold text-sm">Preparing...</p></div>
            )}

            {/* HIGHLIGHTS */}
            {pageHighlights.map((h) => (
              h.rect ? (
                <div
                  key={h.id}
                  className="absolute cursor-pointer group"
                  style={{
                    top: `${h.rect.top}%`,
                    left: `${h.rect.left}%`,
                    width: `${h.rect.width}%`,
                    height: `${h.rect.height}%`,
                    backgroundColor: h.color,
                    opacity: 0.4,
                    mixBlendMode: 'multiply'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHighlight(h.id);
                  }}
                >
                  <button className="hidden md:block group-hover:flex absolute -top-4 -right-4 bg-red-500 text-white p-1 rounded-full shadow-sm z-10 scale-[0.6]"><Trash2 size={16} /></button>
                </div>
              ) : null
            ))}

            {isDrawMode && <canvas ref={canvasRef} className="absolute inset-0 z-50 cursor-crosshair touch-none" width={pdfWidth * scale} height={1200 * scale} onMouseDown={startDrawing} onTouchStart={startDrawing} />}
          </div>
        </div>
      </div>

      {/* FOOTER CONTROLS & SLIDER - Only shown when NOT in Zen mode */}
      {
        !zenMode && (
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-3 shrink-0 z-20">

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
              <button onClick={() => updateBookProgress(currentPage - 1, numPages)} disabled={currentPage <= 1} className="flex items-center gap-1 text-gray-700 dark:text-gray-200 disabled:opacity-30 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><ChevronLeft size={20} /> <span className="hidden md:inline font-bold">Prev</span></button>
              <span className="font-mono text-sm font-bold bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-4 py-1 rounded-full">{currentPage} / {numPages || '--'}</span>
              <button onClick={() => updateBookProgress(currentPage + 1, numPages)} disabled={currentPage >= numPages} className="flex items-center gap-1 text-gray-700 dark:text-gray-200 disabled:opacity-30 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><span className="hidden md:inline font-bold">Next</span> <ChevronRight size={20} /></button>
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
        )
      }

      {isGenerating && generationMode === 'FOREGROUND' && <LoadingOverlay />}

      {/* Logic to keep CheckpointPrompt visible during background generation or when results are ready but not opened */}
      {
        (!isPromptDismissed && (
          (triggerState.show && (!isGenerating || generationMode === 'BACKGROUND') && !isActivityOpen) ||
          (isGenerating && generationMode === 'BACKGROUND') ||
          (activityData && !isActivityOpen && generationMode === 'BACKGROUND')
        ) && (
            (triggerState.type === 'CHAPTER_END' && !manualChapterMode) ||
            (triggerState.type !== 'CHAPTER_END' && enablePeriodicCheckpoints)
          )) && (
          <CheckpointPrompt
            show={true}
            page={currentPage}
            isGenerating={isGenerating && generationMode === 'BACKGROUND'}
            hasReadyActivities={!!activityData && !isActivityOpen && generationMode === 'BACKGROUND'}
            onStartActivity={() => handleStartActivity(triggerState.type, true)}
            onOpenActivity={() => { toggleActivity(true); setGenerationMode(null); }}
            onSkip={() => setIsPromptDismissed(true)}
          />
        )
      }



      {
        selection && !isDrawMode && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-xl z-[60] animate-in slide-in-from-bottom flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button onClick={handleDefine} className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-gray-700 transition">
                  <BookOpen size={14} /> Define
                </button>
                <span className="text-xs font-bold text-gray-500 uppercase self-center ml-2 border-l pl-2 border-gray-300">Highlight</span>
              </div>
              <button onClick={() => { setSelection(null); window.getSelection().removeAllRanges(); }} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button>
            </div>
            <div className="flex justify-between gap-3">{['#fff59d', '#a5d6a7', '#90caf9', '#ef9a9a'].map(color => (<button key={color} onClick={() => saveHighlight(color)} className="flex-1 h-12 rounded-xl border-2 border-transparent transition shadow-sm" style={{ backgroundColor: color }} />))}</div>
          </div>
        )
      }

      {/* Auto-Prompt Logic */}
      {
        !isPromptDismissed && !isGenerating && !activityData && !isScrubbing && triggerState.show && (
          (triggerState.type === 'CHAPTER_END' && !manualChapterMode) ||
          (triggerState.type !== 'CHAPTER_END' && enablePeriodicCheckpoints)
        ) && (
          <CheckpointPrompt
            show={true}
            page={currentPage}
            onStartActivity={(isBackground) => handleStartActivity(triggerState.type, isBackground)}
            onSkip={() => setIsPromptDismissed(true)}
          />
        )
      }

      {/* FILE RECOVERY UI */}
      {
        activeBook.isMissingFile && (
          <div className="fixed inset-0 z-[100] bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full animate-in zoom-in">
              <div className="bg-red-100 text-red-600 p-4 rounded-full inline-block mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Local File Not Found</h2>
              <p className="text-gray-500 mb-6 text-sm">
                The PDF file for <span className="font-bold">"{activeBook.title}"</span> is missing from this device.
                This happens if you cleared browser data or synced from another device.
              </p>

              <label className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer transition shadow-lg">
                <span className="flex items-center justify-center gap-2">
                  <UploadCloud size={20} /> Re-upload PDF
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files[0]) useAppStore.getState().recoverLocalBook(e.target.files[0]);
                  }}
                />
              </label>
              <button
                onClick={() => setScreen('DASHBOARD')}
                className="mt-4 text-gray-400 font-bold hover:text-gray-600 text-sm"
              >
                Go Back
              </button>
            </div>
          </div>
        )
      }

      {/* ACTIVITY OVERLAY - Added safety check to prevent showing during background generation */}
      {
        isActivityOpen && activityData && generationMode !== 'BACKGROUND' && (
          <ActivityOverlay
            data={activityData}
            bookId={activeBook.id}
            onClose={() => { setActivityData(null); toggleActivity(false); }}
          />
        )
      }

      {/* DICTIONARY MODAL */}
      {
        dictionaryData && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4 md:p-0" onClick={() => setDictionaryData(null)}>
            <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-800 capitalize">{dictionaryData.word}</h2>
                  {dictionaryData.phonetic && <p className="text-gray-400 font-mono">{dictionaryData.phonetic}</p>}
                </div>
                <button onClick={() => setDictionaryData(null)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-4">
                {dictionaryData.meanings?.map((m, i) => (
                  <div key={i}>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">{m.partOfSpeech}</p>
                    <ul className="list-disc pl-5 space-y-2">
                      {m.definitions.slice(0, 3).map((d, j) => (
                        <li key={j} className="text-sm text-gray-700 leading-relaxed">
                          {d.definition}
                          {d.example && <p className="text-xs text-gray-400 italic mt-1">"{d.example}"</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {(!dictionaryData.meanings || dictionaryData.meanings.length === 0) && (
                  <p className="text-gray-500">No definitions found.</p>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ZEN CONTROLS OVERLAY */}
      {
        zenMode && (
          <ZenControls
            visible={showZenControls}
            onClose={() => setShowZenControls(false)}
            currentPage={currentPage}
            numPages={numPages}
            onBack={() => setScreen('DASHBOARD')}
          />
        )
      }
    </div>
  );
};

export default BookViewer;