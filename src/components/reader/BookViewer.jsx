import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ArrowLeft, ZoomIn, ZoomOut, Maximize, PenTool, X, Trash2, UploadCloud, BookOpen, Moon, Sun } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

// Hooks & Components
import { useSmartTrigger } from '../../hooks/useSmartTrigger';
import CheckpointPrompt from '../overlays/CheckpointPrompt';
import ActivityOverlay from '../overlays/ActivityOverlay';
import LoadingOverlay from '../overlays/LoadingOverlay';
import ReaderHeader from './ReaderHeader';
import ReaderFooter from './ReaderFooter';
import DictionaryModal from './DictionaryModal';

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

// Static loader reference to prevent react-pdf from re-rendering due to prop changes
const PAGE_LOADER = (
  <div className="flex items-center justify-center h-[500px]">
    <Loader2 className="animate-spin text-gray-400" />
  </div>
);

// --- Gesture Constants ---
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.15;
const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_ZOOM = 2.5;
const SCRUBBER_HIDE_DELAY = 3500;

const BookViewer = () => {
  const { activeBook, updateBookProgress, updateBookStructure, setScreen, toggleActivity, addHighlight, highlights, deleteHighlight, isActivityOpen } = useAppStore();

  const [numPages, setNumPages] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generationMode, setGenerationMode] = useState(null);
  const [showGoToPage, setShowGoToPage] = useState(false);
  const [goToPageInput, setGoToPageInput] = useState('');

  // --- Zoom & Pan State ---
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // --- Scrubber State ---
  const [showScrubber, setShowScrubber] = useState(false);
  const [scrubberValue, setScrubberValue] = useState(null);
  const scrubberTimerRef = useRef(null);

  // Tools State
  const [selection, setSelection] = useState(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const canvasRef = useRef(null);
  const pageContainerRef = useRef(null);

  // Gesture Refs
  const gestureContainerRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(1.0);

  // Dictionary State
  const [dictionaryData, setDictionaryData] = useState(null);

  const handleDefine = async () => {
    if (!selection?.text) return;
    const word = selection.text.trim();
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!res.ok) {
        setDictionaryData({ word, meanings: [] });
        setSelection(null);
        window.getSelection()?.removeAllRanges();
        return;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setDictionaryData(data[0]);
      } else {
        setDictionaryData({ word, meanings: [] });
      }
    } catch (e) {
      console.error("Dictionary API Error:", e);
      setDictionaryData({ word, meanings: [] });
    }
    setSelection(null);
    window.getSelection()?.removeAllRanges();
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

    let url = null;
    let active = true;

    if (activeBook.type === 'CLOUD') {
      setPdfUrl(activeBook.url);
    } else if (activeBook.fileData && activeBook.fileData instanceof Blob) {
      url = URL.createObjectURL(activeBook.fileData);
      setPdfUrl(url);
    }

    const initBook = async () => {
      let blob = activeBook.fileData;
      if (!blob) return;

      if (!activeBook.structure && activeBook.progress <= 1) {
        let structure = await getPdfOutline(blob);
        if (!structure) {
          structure = await analyzeTextStructure(blob);
        }
        if (active && structure) {
          if (structure.startPage) {
            updateBookStructure(structure);
            updateBookProgress(structure.startPage, numPages);
          } else if (structure.chapters) {
            updateBookStructure(structure);
          }
        }
      }
    };

    initBook();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [activeBook?.id, activeBook?.type, activeBook?.fileData, activeBook?.url]);

  const currentPage = activeBook?.progress || 1;

  // --- RESET ON PAGE TURN ---
  useEffect(() => {
    setIsPromptDismissed(false);
    setSelection(null);
    // Reset zoom & pan on page change
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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

  // =============================================
  // GESTURE HANDLING — Zoom, Pan, Double-tap, Scrubber
  // =============================================

  const isZoomed = zoomLevel > 1.05;

  const clampZoom = useCallback((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)), []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // --- Scrubber auto-hide logic ---
  const showScrubberWithTimer = useCallback(() => {
    setShowScrubber(true);
    if (scrubberTimerRef.current) clearTimeout(scrubberTimerRef.current);
    scrubberTimerRef.current = setTimeout(() => setShowScrubber(false), SCRUBBER_HIDE_DELAY);
  }, []);

  useEffect(() => {
    return () => {
      if (scrubberTimerRef.current) clearTimeout(scrubberTimerRef.current);
    };
  }, []);

  // --- MOUSE: Ctrl+Wheel zoom, drag-to-pan ---
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoomLevel(prev => {
        const next = clampZoom(prev + delta);
        if (next <= 1.05) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  }, [clampZoom]);

  useEffect(() => {
    const el = gestureContainerRef.current;
    if (!el) return;
    // Must use non-passive to allow preventDefault on wheel with ctrlKey
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e) => {
    if (isDrawMode) return;
    if (!isZoomed) return;
    if (e.button !== 0) return; // Left click only
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetStartRef.current = { ...panOffset };
    e.preventDefault();
  }, [isDrawMode, isZoomed, panOffset]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanOffset({
      x: panOffsetStartRef.current.x + dx / zoomLevel,
      y: panOffsetStartRef.current.y + dy / zoomLevel,
    });
  }, [isPanning, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // --- TOUCH: Pinch-to-zoom, double-tap, single-finger pan ---
  const handleTouchStart = useCallback((e) => {
    if (isDrawMode) return;

    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoomLevel;
      e.preventDefault();
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        e.preventDefault();
        if (isZoomed) {
          resetZoom();
        } else {
          setZoomLevel(DOUBLE_TAP_ZOOM);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Pan start (when zoomed)
      if (isZoomed) {
        setIsPanning(true);
        panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panOffsetStartRef.current = { ...panOffset };
      }
    }
  }, [isDrawMode, zoomLevel, isZoomed, resetZoom, panOffset]);

  const handleTouchMove = useCallback((e) => {
    if (isDrawMode) return;

    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scaleFactor = dist / pinchStartDistRef.current;
      const newZoom = clampZoom(pinchStartZoomRef.current * scaleFactor);
      setZoomLevel(newZoom);
      if (newZoom <= 1.05) setPanOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isPanning) {
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      setPanOffset({
        x: panOffsetStartRef.current.x + dx / zoomLevel,
        y: panOffsetStartRef.current.y + dy / zoomLevel,
      });
    }
  }, [isDrawMode, isPanning, zoomLevel, clampZoom]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsPanning(false);
    }
  }, []);

  // --- CENTER TAP → toggle scrubber, LEFT/RIGHT → navigate ---
  const handleViewerClick = useCallback((e) => {
    // Skip if user is selecting text, drawing, or interacting with buttons
    if (isDrawMode) return;
    const target = e.target;
    if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('.interactive')) return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;

    // Ignore if panning happened (mouse moved > 5px)
    if (isPanning) return;

    const width = window.innerWidth;
    const x = e.clientX;

    if (zenMode) {
      // Zen mode zones
      if (x < width * 0.2) {
        if (currentPage > 1) updateBookProgress(currentPage - 1, numPages);
      } else if (x > width * 0.8) {
        if (currentPage < numPages) updateBookProgress(currentPage + 1, numPages);
      } else {
        setShowZenControls(!showZenControls);
      }
    } else {
      // Normal mode: center tap toggles scrubber
      if (x < width * 0.2) {
        if (currentPage > 1) updateBookProgress(currentPage - 1, numPages);
      } else if (x > width * 0.8) {
        if (currentPage < numPages) updateBookProgress(currentPage + 1, numPages);
      } else {
        showScrubberWithTimer();
      }
    }
  }, [isDrawMode, isPanning, zenMode, currentPage, numPages, updateBookProgress, showZenControls, showScrubberWithTimer]);

  // --- Keyboard navigation ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showGoToPage) return;
      if (e.key === 'ArrowRight' && currentPage < numPages) updateBookProgress(currentPage + 1, numPages);
      if (e.key === 'ArrowLeft' && currentPage > 1) updateBookProgress(currentPage - 1, numPages);
      if (e.key === '0' || e.key === 'Escape') resetZoom();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGoToPage, currentPage, numPages, updateBookProgress, resetZoom]);

  // --- SMART AI HANDLER (VISION + TEXT) --- (Preserved from original)
  const handleStartActivity = async (triggerType = 'MICRO', background = false) => {
    setGenerationMode(background ? 'BACKGROUND' : 'FOREGROUND');
    if (background) {
      toggleActivity(false);
    } else {
      toggleActivity(true);
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
      let limit = 5;
      if (triggerType === 'CHAPTER_END') {
        limit = settings.chapterContextLimit || 15;
      } else {
        const isScanned = activeBook.isScanned === true;
        limit = isScanned ? (settings.scannedContextLimit || 3) : (settings.textContextLimit || 5);
      }
      if (!limit || typeof limit !== 'number' || limit < 1) {
        console.warn('Invalid context limit detected:', limit, 'Resetting to 5.');
        limit = 5;
      }

      const startPage = Math.max(1, currentPage - limit + 1);
      const parsedInput = await parsePdf(fileToRead, startPage, currentPage);

      if (!parsedInput || parsedInput.mode === 'ERROR' || !parsedInput.data) {
        console.error('PDF parsing failed or returned no data');
        throw new Error("Could not extract content from this page. The PDF may be corrupted or the page may be unreadable.");
      }

      const aiData = await generateActivities(parsedInput, triggerType || 'MICRO');

      if (aiData) {
        setActivityData(aiData);
        const bookId = activeBook.id.toString();
        const itemsToSave = [];
        if (aiData.quiz && Array.isArray(aiData.quiz)) {
          aiData.quiz.forEach(q => itemsToSave.push({ ...q, bookId }));
        }
        if (aiData.concept_map) {
          itemsToSave.push({ ...aiData.concept_map, bookId });
        }
        if (itemsToSave.length > 0) {
          useAppStore.getState().addMultipleFavorites(itemsToSave);
        }

        const visualTask = aiData.quiz?.find(q => q.type === 'visual');
        const imgSettings = useSettingsStore.getState();
        if (visualTask && visualTask.image_prompt && imgSettings.imageGenProvider !== 'NONE') {
          const prompt = visualTask.image_prompt;
          const imageId = Date.now().toString();
          useAppStore.getState().addToGallery({
            id: imageId, bookId: activeBook.id, timestamp: Date.now(), prompt, url: null, status: 'pending'
          });
          generateImageBackground(prompt)
            .then((url) => { useAppStore.getState().updateGalleryImage(imageId, url, 'success'); })
            .catch((err) => { console.error('Background image generation failed:', err); useAppStore.getState().updateGalleryImage(imageId, null, 'error'); });
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
      setIsGenerating(false);
    }
  };

  if (!activeBook) return <div>Loading...</div>;
  const pageHighlights = highlights.filter(h => h.bookId === activeBook.id && h.page === currentPage);

  // --- RESPONSIVE PDF WIDTH ---
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    let timeoutId = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { setWindowWidth(window.innerWidth); }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timeoutId); };
  }, []);

  const pdfWidth = windowWidth > 800 ? 600 : windowWidth - 32;

  // Theme helpers
  const getThemeBg = () => {
    switch (readerTheme) {
      case 'dark': return 'bg-[#1C1C1E]';
      case 'sepia': return 'bg-[#F4ECD8]';
      case 'night': return 'bg-[#1A1612]';
      default: return 'bg-[#FAFAF8]';
    }
  };

  const getFontClass = () => {
    switch (readerFont) {
      case 'Georgia': return 'font-georgia';
      case 'OpenDyslexic': return 'font-dyslexic';
      case 'System': return 'font-system';
      default: return 'font-literata';
    }
  };

  // --- Scrubber handlers ---
  const handleScrubberChange = (e) => {
    setScrubberValue(parseInt(e.target.value));
    showScrubberWithTimer();
  };

  const handleScrubberCommit = () => {
    if (scrubberValue !== null) {
      updateBookProgress(scrubberValue, numPages);
      setTimeout(() => setScrubberValue(null), 100);
    }
  };

  return (
    <div
      className={`zen-reader h-screen w-screen flex flex-col overflow-hidden theme-${readerTheme} ${getFontClass()}`}
    >
      {/* HEADER */}
      <ReaderHeader
        zenMode={zenMode}
        activeBook={activeBook}
        readerDarkMode={readerDarkMode}
        toggleReaderDarkMode={toggleReaderDarkMode}
        isDrawMode={isDrawMode}
        setIsDrawMode={setIsDrawMode}
        setScreen={setScreen}
      />

      {/* ========= MAIN VIEWER AREA ========= */}
      <div
        ref={gestureContainerRef}
        className={`flex-1 flex items-center justify-center overflow-hidden relative select-none ${isZoomed && !isDrawMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ touchAction: isDrawMode ? 'auto' : 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleViewerClick}
      >
        <div
          className="relative transition-transform origin-center"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
            willChange: 'transform',
          }}
        >
          <div
            ref={pageContainerRef}
            className={`relative min-h-[300px] transition-all duration-300 zen-page ${(readerTheme === 'dark' || readerTheme === 'night') ? 'pdf-dark-mode' : ''}`}
          >
            {pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages: n }) => { setNumPages(n); if (!activeBook.totalPages) updateBookProgress(currentPage, n); }}
                loading={<div className="h-96 flex flex-col items-center justify-center text-gray-500"><Loader2 className="animate-spin mb-2" size={40} /><p className="font-bold text-sm">Loading Book...</p></div>}
                error={<div className="h-96 flex items-center justify-center text-red-500 p-8 text-center font-bold">Failed to load PDF.</div>}
              >
                <Page
                  pageNumber={currentPage}
                  width={pdfWidth}
                  renderTextLayer={!isDrawMode}
                  renderAnnotationLayer={false}
                  loading={PAGE_LOADER}
                />
              </Document>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-gray-500"><Loader2 className="animate-spin mb-2" size={40} /><p className="font-bold text-sm">Preparing...</p></div>
            )}

            {/* BOOKMARK RIBBON */}
            {useAppStore(s => s.bookmarks).some(b => b.bookId === activeBook.id && b.page === currentPage) && (
              <div className="bookmark-indicator visible" />
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
                  onClick={(e) => { e.stopPropagation(); deleteHighlight(h.id); }}
                >
                  <button className="hidden md:block group-hover:flex absolute -top-4 -right-4 bg-red-500 text-white p-1 rounded-full shadow-sm z-10 scale-[0.6]"><Trash2 size={16} /></button>
                </div>
              ) : null
            ))}

            {isDrawMode && <canvas ref={canvasRef} className="absolute inset-0 z-50 cursor-crosshair touch-none" width={pdfWidth} height={pdfWidth * 1.414} onMouseDown={startDrawing} onTouchStart={startDrawing} />}
          </div>
        </div>
      </div>

      {/* ========= FLOATING ZOOM CONTROLS ========= */}
      <div className="fixed bottom-24 left-4 z-40 flex flex-col gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => clampZoom(prev + ZOOM_STEP * 2)); }}
          className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); const next = clampZoom(zoomLevel - ZOOM_STEP * 2); setZoomLevel(next); if (next <= 1.05) setPanOffset({ x: 0, y: 0 }); }}
          className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        {isZoomed && (
          <button
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            className="w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors active:scale-95"
            title="Reset Zoom"
          >
            <Maximize size={16} />
          </button>
        )}
        {/* Zoom level indicator */}
        <div className="text-[10px] font-mono text-center text-gray-400 dark:text-gray-500 mt-0.5">
          {Math.round(zoomLevel * 100)}%
        </div>
      </div>

      {/* ========= PAGE SCRUBBER (Auto-hidden) ========= */}
      <ReaderFooter
        zenMode={zenMode}
        numPages={numPages}
        currentPage={currentPage}
        showScrubber={showScrubber}
        scrubberValue={scrubberValue}
        handleScrubberChange={handleScrubberChange}
        handleScrubberCommit={handleScrubberCommit}
        showGoToPage={showGoToPage}
        setShowGoToPage={setShowGoToPage}
        goToPageInput={goToPageInput}
        setGoToPageInput={setGoToPageInput}
        updateBookProgress={updateBookProgress}
        manualChapterMode={manualChapterMode}
        handleStartActivity={handleStartActivity}
        onScrubberInteract={showScrubberWithTimer}
      />

      {isGenerating && generationMode === 'FOREGROUND' && <LoadingOverlay />}

      {/* CheckpointPrompt during background generation */}
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

      {/* Text Selection Bar */}
      {
        selection && !isDrawMode && (
          <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-xl z-[60] animate-in slide-in-from-bottom flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button onClick={handleDefine} className="px-4 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-gray-700 dark:hover:bg-gray-300 transition">
                  <BookOpen size={14} /> Define
                </button>
                <span className="text-xs font-bold text-gray-500 uppercase self-center ml-2 border-l pl-2 border-gray-300 dark:border-gray-600">Highlight</span>
              </div>
              <button onClick={() => { setSelection(null); window.getSelection().removeAllRanges(); }} className="p-1 bg-gray-100 dark:bg-gray-700 rounded-full"><X size={16} /></button>
            </div>
            <div className="flex justify-between gap-3">{['#fff59d', '#a5d6a7', '#90caf9', '#ef9a9a'].map(color => (<button key={color} onClick={() => saveHighlight(color)} className="flex-1 h-12 rounded-xl border-2 border-transparent transition shadow-sm" style={{ backgroundColor: color }} />))}</div>
          </div>
        )
      }

      {/* Auto-Prompt Logic */}
      {
        !isPromptDismissed && !isGenerating && !activityData && triggerState.show && (
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
          <div className="fixed inset-0 z-[100] bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl max-w-md w-full animate-in zoom-in">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 p-4 rounded-full inline-block mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Local File Not Found</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
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
                  onChange={(e) => { if (e.target.files[0]) useAppStore.getState().recoverLocalBook(e.target.files[0]); }}
                />
              </label>
              <button onClick={() => setScreen('DASHBOARD')} className="mt-4 text-gray-400 font-bold hover:text-gray-600 dark:hover:text-gray-200 text-sm">
                Go Back
              </button>
            </div>
          </div>
        )
      }

      {/* ACTIVITY OVERLAY */}
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
      <DictionaryModal
        dictionaryData={dictionaryData}
        onClose={() => setDictionaryData(null)}
      />

      {/* ZEN CONTROLS OVERLAY */}
      {
        zenMode && (
          <ZenControls
            visible={showZenControls}
            onClose={() => setShowZenControls(false)}
            currentPage={currentPage}
            numPages={numPages}
            onBack={() => setScreen('DASHBOARD')}
            onNavigateToPage={(page) => updateBookProgress(page, numPages)}
            scale={zoomLevel}
            setScale={setZoomLevel}
          />
        )
      }
    </div>
  );
};

export default BookViewer;