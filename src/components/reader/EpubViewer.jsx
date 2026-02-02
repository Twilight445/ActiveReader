import React, { useState, useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, X, List, Bookmark, Settings, Sun, Moon, Brain, Sparkles } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import useSettingsStore from '../../store/useSettingsStore';

// Checkpoint Components
import CheckpointPrompt from '../overlays/CheckpointPrompt';
import ActivityOverlay from '../overlays/ActivityOverlay';
import LoadingOverlay from '../overlays/LoadingOverlay';

// AI Services
import { generateActivities } from '../../services/aiFactory';
import { generateImageBackground } from '../../services/imageGenService';

const EpubViewer = () => {
    const { activeBook, setScreen, toggleBookmark, bookmarks, updateBookProgress, toggleActivity, isActivityOpen } = useAppStore();
    const { readerTheme, setReaderTheme, fontSize, setFontSize, enablePeriodicCheckpoints, checkpointIntervalPercent } = useSettingsStore();

    const containerRef = useRef(null);
    const bookRef = useRef(null);
    const renditionRef = useRef(null);
    const isInitializedRef = useRef(false);
    const lastCheckpointRef = useRef(0);

    // Core State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toc, setToc] = useState([]);
    const [progress, setProgress] = useState(0);
    const [currentCfi, setCurrentCfi] = useState(null);
    const [totalPages, setTotalPages] = useState(100);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentChapterText, setCurrentChapterText] = useState('');

    // UI State
    const [showControls, setShowControls] = useState(true);
    const [showToc, setShowToc] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showGoToPage, setShowGoToPage] = useState(false);
    const [goToPageInput, setGoToPageInput] = useState('');
    const [sliderValue, setSliderValue] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Checkpoint State
    const [showCheckpoint, setShowCheckpoint] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationMode, setGenerationMode] = useState(null);
    const [activityData, setActivityData] = useState(null);
    const [isPromptDismissed, setIsPromptDismissed] = useState(false);

    // Theme configurations
    const themes = {
        paper: { bg: '#FAFAF8', text: '#1A1A1A', accent: '#4F46E5' },
        sepia: { bg: '#F4ECD8', text: '#3D3222', accent: '#92400E' },
        dark: { bg: '#1C1C1E', text: '#E5E5E5', accent: '#818CF8' },
        night: { bg: '#1A1612', text: '#D4C4A8', accent: '#F59E0B' }
    };
    const currentTheme = themes[readerTheme] || themes.paper;

    // Initialize EPUB
    useEffect(() => {
        if (!activeBook) {
            setScreen('DASHBOARD');
            return;
        }

        if (!activeBook.fileData) {
            console.log('⏳ Waiting for fileData...');
            return;
        }

        if (!containerRef.current) {
            console.log('⏳ Waiting for container...');
            return;
        }

        if (isInitializedRef.current) {
            console.log('📚 Already initialized, skipping...');
            return;
        }

        console.log('📚 Initializing epub.js...');
        isInitializedRef.current = true;

        const initBook = async () => {
            try {
                const viewerDiv = document.createElement('div');
                viewerDiv.id = 'epub-viewer';
                viewerDiv.style.cssText = 'width: 100%; height: 100%;';
                containerRef.current.appendChild(viewerDiv);

                const book = ePub();
                bookRef.current = book;

                const arrayBuffer = await activeBook.fileData.arrayBuffer();
                await book.open(arrayBuffer);
                console.log('✅ Book opened successfully');

                const navigation = await book.loaded.navigation;
                setToc(navigation.toc || []);

                await book.locations.generate(1600);
                setTotalPages(book.locations.length());
                console.log('✅ Locations generated:', book.locations.length());

                const rendition = book.renderTo(viewerDiv, {
                    width: '100%',
                    height: '100%',
                    spread: 'none',
                    flow: 'paginated'
                });
                renditionRef.current = rendition;

                applyTheme(rendition, readerTheme);

                if (activeBook.epubLocation) {
                    await rendition.display(activeBook.epubLocation);
                } else {
                    await rendition.display();
                }
                console.log('✅ Book displayed');

                // Track location changes
                rendition.on('locationChanged', async (location) => {
                    setCurrentCfi(location.start.cfi);
                    if (book.locations.length()) {
                        const pct = book.locations.percentageFromCfi(location.start.cfi);
                        const newProgress = Math.round(pct * 100);
                        setProgress(newProgress);
                        setCurrentPage(Math.ceil(pct * book.locations.length()) || 1);

                        // Check for checkpoint trigger
                        checkForCheckpoint(newProgress);
                    }
                    updateBookProgress(null, null, location.start.cfi);

                    // Extract current visible text for AI context
                    try {
                        const text = await extractVisibleText(rendition);
                        setCurrentChapterText(text);
                    } catch (e) {
                        console.warn('Could not extract text:', e);
                    }
                });

                // Tap zones
                rendition.on('click', (e) => {
                    const width = window.innerWidth;
                    const x = e.clientX || e.touches?.[0]?.clientX;

                    if (x < width * 0.25) {
                        goPrev();
                    } else if (x > width * 0.75) {
                        goNext();
                    } else {
                        setShowControls(prev => !prev);
                    }
                });

                setIsLoading(false);

            } catch (err) {
                console.error('❌ Failed to initialize book:', err);
                setError('Failed to load EPUB: ' + err.message);
                setIsLoading(false);
            }
        };

        initBook();

        return () => {
            console.log('🧹 Cleaning up EPUB...');
            if (renditionRef.current) {
                try { renditionRef.current.destroy(); } catch (e) { }
                renditionRef.current = null;
            }
            if (bookRef.current) {
                try { bookRef.current.destroy(); } catch (e) { }
                bookRef.current = null;
            }
            if (containerRef.current) {
                const viewerDiv = containerRef.current.querySelector('#epub-viewer');
                if (viewerDiv) {
                    try { containerRef.current.removeChild(viewerDiv); } catch (e) { }
                }
            }
            isInitializedRef.current = false;
        };
    }, [activeBook?.id, activeBook?.fileData]);

    // Extract visible text from current view
    const extractVisibleText = async (rendition) => {
        if (!rendition || !rendition.manager) return '';

        const contents = rendition.getContents();
        let text = '';

        contents.forEach(content => {
            const doc = content.document;
            if (doc && doc.body) {
                text += doc.body.innerText || doc.body.textContent || '';
            }
        });

        return text.slice(0, 8000); // Limit context size
    };

    // Checkpoint trigger logic
    const checkForCheckpoint = (newProgress) => {
        if (!enablePeriodicCheckpoints) return;

        const interval = checkpointIntervalPercent || 10;
        const checkpointNumber = Math.floor(newProgress / interval);
        const lastCheckpoint = Math.floor(lastCheckpointRef.current / interval);

        if (checkpointNumber > lastCheckpoint && newProgress > 5) {
            console.log(`📍 Checkpoint triggered at ${newProgress}%`);
            setShowCheckpoint(true);
            setIsPromptDismissed(false);
        }

        lastCheckpointRef.current = newProgress;
    };

    // AI Activity Generation
    const handleStartActivity = async (triggerType = 'MICRO', background = false) => {
        setGenerationMode(background ? 'BACKGROUND' : 'FOREGROUND');

        if (background) {
            toggleActivity(false);
        } else {
            toggleActivity(true);
        }

        setIsGenerating(true);
        setShowCheckpoint(false);

        try {
            // Use extracted chapter text for AI
            if (!currentChapterText || currentChapterText.length < 100) {
                throw new Error("Not enough text content on this page for AI analysis.");
            }

            console.log(`🧠 Generating EPUB Activity with ${currentChapterText.length} chars of context`);

            // Create parsed input in the format the AI expects
            const parsedInput = {
                mode: 'TEXT',
                data: currentChapterText
            };

            // Generate activities
            const aiData = await generateActivities(parsedInput, triggerType);

            if (aiData) {
                setActivityData(aiData);

                // Auto-save to notebook
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
                    console.log(`💾 Auto-saved ${itemsToSave.length} activities to notebook.`);
                }

                // Background image generation
                const visualTask = aiData.quiz?.find(q => q.type === 'visual');
                const settings = useSettingsStore.getState();

                if (visualTask && visualTask.image_prompt && settings.imageGenProvider !== 'NONE') {
                    const prompt = visualTask.image_prompt;
                    const imageId = Date.now().toString();

                    useAppStore.getState().addToGallery({
                        id: imageId, bookId: activeBook.id, timestamp: Date.now(), prompt, url: null, status: 'pending'
                    });

                    generateImageBackground(prompt)
                        .then((url) => {
                            useAppStore.getState().updateGalleryImage(imageId, url, 'success');
                        })
                        .catch((err) => {
                            useAppStore.getState().updateGalleryImage(imageId, null, 'error');
                        });
                }
            } else {
                toggleActivity(false);
                alert("AI failed to analyze this section. Please try again.");
            }

        } catch (error) {
            console.error('AI Generation Error:', error);
            setIsGenerating(false);
            toggleActivity(false);
            alert(error.message || "Failed to generate activities.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Apply theme to rendition
    const applyTheme = (rendition, themeName) => {
        const theme = themes[themeName] || themes.paper;
        rendition.themes.register('custom', {
            body: {
                background: theme.bg,
                color: theme.text,
                'font-size': `${fontSize}px !important`,
                'line-height': '1.8 !important',
                'padding': '20px !important'
            }
        });
        rendition.themes.select('custom');
    };

    useEffect(() => {
        if (renditionRef.current) {
            applyTheme(renditionRef.current, readerTheme);
            renditionRef.current.themes.fontSize(`${fontSize}px`);
        }
    }, [readerTheme, fontSize]);

    // Navigation
    const goNext = () => {
        if (renditionRef.current && !isAnimating) {
            setIsAnimating(true);
            renditionRef.current.next();
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    const goPrev = () => {
        if (renditionRef.current && !isAnimating) {
            setIsAnimating(true);
            renditionRef.current.prev();
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    const goToChapter = (href) => {
        if (renditionRef.current) {
            renditionRef.current.display(href);
            setShowToc(false);
        }
    };

    const goToPercentage = (pct) => {
        if (renditionRef.current && bookRef.current) {
            const cfi = bookRef.current.locations.cfiFromPercentage(pct / 100);
            if (cfi) {
                renditionRef.current.display(cfi);
            }
        }
    };

    const handleSliderChange = (e) => {
        setSliderValue(parseInt(e.target.value));
    };

    const handleSliderCommit = () => {
        if (sliderValue !== null) {
            goToPercentage(sliderValue);
            setTimeout(() => setSliderValue(null), 100);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showGoToPage) return;
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
            if (e.key === 'Escape') setShowControls(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showGoToPage]);

    const isBookmarked = bookmarks.some(b => b.bookId === activeBook?.id && b.epubLocation === currentCfi);

    // Error state
    if (error) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center" style={{ background: currentTheme.bg }}>
                <X className="text-red-500 mb-4" size={48} />
                <p className="text-lg font-bold mb-2" style={{ color: currentTheme.text }}>Error Loading EPUB</p>
                <p className="text-gray-500 mb-6">{error}</p>
                <button
                    onClick={() => setScreen('DASHBOARD')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                >
                    Back to Library
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col relative overflow-hidden" style={{ background: currentTheme.bg }}>

            {/* Header */}
            <div
                className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                    }`}
                style={{ background: `linear-gradient(to bottom, ${currentTheme.bg}, transparent)` }}
            >
                <div className="flex items-center justify-between px-4 py-4">
                    <button
                        onClick={() => setScreen('DASHBOARD')}
                        className="p-2.5 rounded-full backdrop-blur-sm"
                        style={{ background: `${currentTheme.text}20`, color: currentTheme.text }}
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex-1 mx-4 truncate text-center font-semibold" style={{ color: currentTheme.text }}>
                        {activeBook?.title || 'EPUB Reader'}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Quick AI Button */}
                        <button
                            onClick={() => handleStartActivity('MICRO', false)}
                            disabled={isGenerating}
                            className="p-2.5 rounded-full backdrop-blur-sm"
                            style={{ background: `${currentTheme.accent}30`, color: currentTheme.accent }}
                            title="Generate AI Activities"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Brain size={18} />}
                        </button>
                        <button
                            onClick={() => toggleBookmark({ bookId: activeBook?.id, epubLocation: currentCfi, type: 'epub' })}
                            className="p-2.5 rounded-full backdrop-blur-sm"
                            style={{
                                background: isBookmarked ? currentTheme.accent : `${currentTheme.text}20`,
                                color: isBookmarked ? '#fff' : currentTheme.text
                            }}
                        >
                            <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            onClick={() => setShowToc(!showToc)}
                            className="p-2.5 rounded-full backdrop-blur-sm"
                            style={{
                                background: showToc ? currentTheme.accent : `${currentTheme.text}20`,
                                color: showToc ? '#fff' : currentTheme.text
                            }}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2.5 rounded-full backdrop-blur-sm"
                            style={{
                                background: showSettings ? currentTheme.accent : `${currentTheme.text}20`,
                                color: showSettings ? '#fff' : currentTheme.text
                            }}
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* TOC Panel */}
            {showToc && showControls && (
                <div
                    className="absolute top-20 right-4 w-80 max-h-[60vh] rounded-xl shadow-2xl z-50 overflow-hidden"
                    style={{ background: currentTheme.bg, border: `1px solid ${currentTheme.text}20` }}
                >
                    <div className="p-4 font-bold border-b" style={{ color: currentTheme.text, borderColor: `${currentTheme.text}20` }}>
                        Table of Contents
                    </div>
                    <div className="overflow-y-auto max-h-[50vh]">
                        {toc.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => goToChapter(item.href)}
                                className="w-full text-left px-4 py-3 border-b text-sm hover:opacity-70 transition"
                                style={{ color: currentTheme.text, borderColor: `${currentTheme.text}10` }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && showControls && (
                <div
                    className="absolute top-20 right-4 w-72 rounded-xl shadow-2xl z-50 p-4"
                    style={{ background: currentTheme.bg, border: `1px solid ${currentTheme.text}20` }}
                >
                    <h3 className="font-bold mb-4" style={{ color: currentTheme.text }}>Settings</h3>

                    <div className="mb-4">
                        <label className="text-sm opacity-70 mb-2 block" style={{ color: currentTheme.text }}>Font Size</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="px-3 py-1 rounded-lg" style={{ background: `${currentTheme.text}20`, color: currentTheme.text }}>A-</button>
                            <span className="flex-1 text-center font-bold" style={{ color: currentTheme.text }}>{fontSize}px</span>
                            <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="px-3 py-1 rounded-lg" style={{ background: `${currentTheme.text}20`, color: currentTheme.text }}>A+</button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm opacity-70 mb-2 block" style={{ color: currentTheme.text }}>Theme</label>
                        <div className="grid grid-cols-4 gap-2">
                            {Object.entries(themes).map(([name, t]) => (
                                <button
                                    key={name}
                                    onClick={() => setReaderTheme(name)}
                                    className={`p-3 rounded-lg border-2 transition ${readerTheme === name ? 'ring-2 ring-offset-2' : ''}`}
                                    style={{
                                        background: t.bg,
                                        borderColor: readerTheme === name ? t.accent : 'transparent',
                                        ringColor: t.accent
                                    }}
                                >
                                    {name === 'dark' || name === 'night' ? <Moon size={16} style={{ color: t.text }} /> : <Sun size={16} style={{ color: t.text }} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* EPUB Container */}
            <div
                ref={containerRef}
                className={`flex-1 overflow-hidden relative mx-auto transition-all duration-300 ${isAnimating ? 'epub-page-flip' : ''}`}
                style={{
                    maxWidth: '800px',
                    width: '100%',
                    margin: '60px auto',
                    boxShadow: readerTheme === 'paper' ? '0 4px 20px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    background: currentTheme.bg
                }}
            />

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: currentTheme.bg }}>
                    <Loader2 className="animate-spin mb-4" size={48} style={{ color: currentTheme.accent }} />
                    <p className="text-lg font-bold" style={{ color: currentTheme.text }}>Loading EPUB...</p>
                </div>
            )}

            {/* Footer */}
            <div
                className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                    }`}
                style={{ background: `linear-gradient(to top, ${currentTheme.bg}, transparent)` }}
            >
                <div className="px-6 py-4 space-y-3">
                    {/* Progress Slider */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono w-10 text-right" style={{ color: currentTheme.text }}>{sliderValue !== null ? sliderValue : progress}%</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={sliderValue !== null ? sliderValue : progress}
                            onInput={handleSliderChange}
                            onChange={() => { }}
                            onMouseUp={handleSliderCommit}
                            onTouchEnd={handleSliderCommit}
                            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, ${currentTheme.accent} ${sliderValue !== null ? sliderValue : progress}%, ${currentTheme.text}30 ${sliderValue !== null ? sliderValue : progress}%)`,
                                accentColor: currentTheme.accent
                            }}
                        />
                        <span className="text-xs font-mono w-10" style={{ color: currentTheme.text }}>100%</span>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center">
                        <button
                            onClick={goPrev}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition"
                            style={{ background: `${currentTheme.text}10`, color: currentTheme.text }}
                        >
                            <ChevronLeft size={20} />
                            <span className="hidden sm:inline font-medium">Prev</span>
                        </button>

                        <button
                            onClick={() => {
                                setGoToPageInput(String(progress));
                                setShowGoToPage(true);
                            }}
                            className="font-mono text-sm font-bold px-4 py-1.5 rounded-full transition hover:scale-105"
                            style={{ background: `${currentTheme.text}15`, color: currentTheme.text }}
                        >
                            {sliderValue !== null ? sliderValue : progress}% • Page ~{currentPage}/{totalPages}
                        </button>

                        <button
                            onClick={goNext}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition"
                            style={{ background: `${currentTheme.text}10`, color: currentTheme.text }}
                        >
                            <span className="hidden sm:inline font-medium">Next</span>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Go to Page Modal */}
            {showGoToPage && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-[100]"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setShowGoToPage(false)}
                >
                    <div
                        className="rounded-2xl p-6 w-80 shadow-2xl"
                        style={{ background: currentTheme.bg }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold mb-4" style={{ color: currentTheme.text }}>Jump to Percentage</h3>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={goToPageInput}
                                onChange={(e) => setGoToPageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const pct = parseInt(goToPageInput);
                                        if (pct >= 0 && pct <= 100) {
                                            goToPercentage(pct);
                                            setShowGoToPage(false);
                                        }
                                    }
                                }}
                                className="flex-1 px-4 py-2 border rounded-lg text-center text-lg font-bold focus:ring-2 focus:outline-none"
                                style={{
                                    background: `${currentTheme.text}10`,
                                    borderColor: `${currentTheme.text}20`,
                                    color: currentTheme.text
                                }}
                                autoFocus
                            />
                            <button
                                onClick={() => {
                                    const pct = parseInt(goToPageInput);
                                    if (pct >= 0 && pct <= 100) {
                                        goToPercentage(pct);
                                        setShowGoToPage(false);
                                    }
                                }}
                                className="px-4 py-2 text-white font-bold rounded-lg transition hover:opacity-90"
                                style={{ background: currentTheme.accent }}
                            >
                                Go
                            </button>
                        </div>
                        <p className="text-xs mt-2 text-center" style={{ color: `${currentTheme.text}80` }}>
                            Enter percentage (0-100%)
                        </p>
                    </div>
                </div>
            )}

            {/* Checkpoint Prompt */}
            {showCheckpoint && !isPromptDismissed && !isActivityOpen && enablePeriodicCheckpoints && (
                <CheckpointPrompt
                    show={true}
                    page={currentPage}
                    isGenerating={isGenerating && generationMode === 'BACKGROUND'}
                    hasReadyActivities={!!activityData && !isActivityOpen && generationMode === 'BACKGROUND'}
                    onStartActivity={() => handleStartActivity('MICRO', true)}
                    onOpenActivities={() => toggleActivity(true)}
                    onDismiss={() => {
                        setIsPromptDismissed(true);
                        setShowCheckpoint(false);
                    }}
                />
            )}

            {/* Activity Overlay */}
            {isActivityOpen && (
                <ActivityOverlay
                    data={activityData}
                    isGenerating={isGenerating}
                />
            )}

            {/* Loading Overlay for foreground generation */}
            {isGenerating && generationMode === 'FOREGROUND' && <LoadingOverlay />}
        </div>
    );
};

export default EpubViewer;
