import React, { useState, useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, X, List } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

const EpubViewer = () => {
    const { activeBook, setScreen, updateBookProgress } = useAppStore();
    const viewerRef = useRef(null);
    const bookRef = useRef(null);
    const renditionRef = useRef(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [toc, setToc] = useState([]);
    const [showToc, setShowToc] = useState(false);
    const [progress, setProgress] = useState(0);

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

        console.log('📚 Initializing epub.js with fileData');

        const initBook = async () => {
            try {
                // Create the book
                const book = ePub();
                bookRef.current = book;

                // Open from ArrayBuffer
                const arrayBuffer = await activeBook.fileData.arrayBuffer();
                await book.open(arrayBuffer);
                console.log('✅ Book opened successfully');

                // Get TOC
                const navigation = await book.loaded.navigation;
                setToc(navigation.toc || []);
                console.log('✅ TOC loaded:', navigation.toc?.length || 0, 'items');

                // Create rendition
                const rendition = book.renderTo(viewerRef.current, {
                    width: '100%',
                    height: '100%',
                    spread: 'none',
                    flow: 'paginated'
                });
                renditionRef.current = rendition;

                // Display
                await rendition.display();
                console.log('✅ Book displayed');

                // Track location changes
                rendition.on('locationChanged', (location) => {
                    setCurrentLocation(location);
                    if (book.locations.length()) {
                        const pct = book.locations.percentageFromCfi(location.start.cfi);
                        setProgress(Math.round(pct * 100));
                    }
                });

                // Handle errors
                rendition.on('displayError', (err) => {
                    console.error('❌ Display error:', err);
                    setError('Failed to display content: ' + err.message);
                });

                setIsLoading(false);

            } catch (err) {
                console.error('❌ Failed to initialize book:', err);
                setError('Failed to load EPUB: ' + err.message);
                setIsLoading(false);
            }
        };

        initBook();

        // Cleanup
        return () => {
            if (bookRef.current) {
                bookRef.current.destroy();
            }
        };
    }, [activeBook?.id, activeBook?.fileData]);

    // Navigation functions
    const goNext = () => {
        if (renditionRef.current) {
            renditionRef.current.next();
        }
    };

    const goPrev = () => {
        if (renditionRef.current) {
            renditionRef.current.prev();
        }
    };

    const goToChapter = (href) => {
        if (renditionRef.current) {
            renditionRef.current.display(href);
            setShowToc(false);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Loading state
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin mb-4 text-indigo-600" size={48} />
                <p className="text-lg font-bold text-gray-700">Loading EPUB...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-100">
                <X className="text-red-500 mb-4" size={48} />
                <p className="text-lg font-bold text-gray-800 mb-2">Error Loading EPUB</p>
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
        <div className="h-screen w-screen flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <button
                    onClick={() => setScreen('DASHBOARD')}
                    className="p-2 hover:bg-gray-200 rounded-full"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="flex-1 mx-4 truncate text-center font-medium text-gray-700">
                    {activeBook?.title || 'EPUB Reader'}
                </div>

                <button
                    onClick={() => setShowToc(!showToc)}
                    className={`p-2 rounded-full ${showToc ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-200'}`}
                >
                    <List size={20} />
                </button>
            </div>

            {/* TOC Sidebar */}
            {showToc && (
                <div className="absolute top-14 right-0 w-80 max-h-[70vh] bg-white border shadow-lg rounded-lg m-4 z-50 overflow-hidden">
                    <div className="p-3 border-b font-bold text-gray-700">Table of Contents</div>
                    <div className="overflow-y-auto max-h-[60vh]">
                        {toc.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => goToChapter(item.href)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b text-sm"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* EPUB Content */}
            <div
                ref={viewerRef}
                className="flex-1 overflow-hidden"
                style={{ minHeight: '400px' }}
            />

            {/* Footer Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <button
                    onClick={goPrev}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-200 rounded-lg"
                >
                    <ChevronLeft size={20} />
                    <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="text-sm text-gray-500">
                    {progress}% complete
                </div>

                <button
                    onClick={goNext}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-200 rounded-lg"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default EpubViewer;
