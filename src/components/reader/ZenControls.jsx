import React, { useState, useEffect } from 'react';
import { ArrowLeft, Type, Palette, Bookmark, Settings, Sun, Moon, BookOpen, X, Minus, Plus, AlignLeft, AlignCenter, Eye, Brain, Clock } from 'lucide-react';
import useSettingsStore from '../../store/useSettingsStore';
import useAppStore from '../../store/useAppStore';

const ZenControls = ({ visible, onClose, currentPage, numPages, onBack }) => {
    const [activePanel, setActivePanel] = useState(null); // 'typography' | 'theme' | 'study' | null
    const [autoHideTimer, setAutoHideTimer] = useState(null);

    // Settings
    const {
        readerTheme, setReaderTheme,
        readerFont, setReaderFont,
        fontSize, setFontSize,
        lineHeight, setLineHeight,
        marginSize, setMarginSize
    } = useSettingsStore();

    // App Data for Bookmarks
    const bookmarks = useAppStore(s => s.bookmarks);
    const toggleBookmark = useAppStore(s => s.toggleBookmark);
    const activeBook = useAppStore(s => s.activeBook);

    // Derived State
    const isBookmarked = bookmarks.some(b => b.bookId === activeBook?.id && b.page === currentPage);
    const progress = numPages ? Math.round((currentPage / numPages) * 100) : 0;

    // Time Left Estimate (Assuming 1.5 mins per page for deep reading)
    const minsLeft = numPages ? Math.ceil((numPages - currentPage) * 1.5) : 0;
    const timeLeftString = minsLeft > 60
        ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`
        : `${minsLeft} min${minsLeft !== 1 ? 's' : ''}`;

    // Auto-hide after 3 seconds of inactivity
    useEffect(() => {
        if (visible && !activePanel) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            setAutoHideTimer(timer);
            return () => clearTimeout(timer);
        }
    }, [visible, activePanel, onClose]);

    const cancelAutoHide = () => {
        if (autoHideTimer) clearTimeout(autoHideTimer);
    };

    if (!visible) return null;

    const themes = [
        { id: 'paper', label: 'Paper', bg: '#FAFAF8', text: '#1A1A1A', icon: '📄' },
        { id: 'sepia', label: 'Sepia', bg: '#F4ECD8', text: '#3D3222', icon: '📜' },
        { id: 'dark', label: 'Dark', bg: '#1C1C1E', text: '#E5E5E5', icon: '🌙' },
        { id: 'night', label: 'Night', bg: '#1A1612', text: '#D4C4A8', icon: '🌃' },
    ];

    const fonts = [
        { id: 'Literata', label: 'Literata', sample: 'Aa' },
        { id: 'Georgia', label: 'Georgia', sample: 'Aa' },
        { id: 'System', label: 'System', sample: 'Aa' },
    ];

    return (
        <div
            className="fixed inset-0 z-[80] pointer-events-none"
            onClick={cancelAutoHide}
        >
            {/* Top Bar */}
            <div className={`absolute top-0 left-0 right-0 pointer-events-auto transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="bg-gradient-to-b from-black/80 to-transparent px-4 py-4 flex justify-between items-center">
                    <button
                        onClick={onBack}
                        className="p-2 text-white/90 hover:text-white rounded-full hover:bg-white/10 transition"
                    >
                        <ArrowLeft size={24} />
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Typography */}
                        <button
                            onClick={() => setActivePanel(activePanel === 'typography' ? null : 'typography')}
                            className={`p-2 rounded-full transition ${activePanel === 'typography' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            <Type size={22} />
                        </button>

                        {/* Theme */}
                        <button
                            onClick={() => setActivePanel(activePanel === 'theme' ? null : 'theme')}
                            className={`p-2 rounded-full transition ${activePanel === 'theme' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            <Palette size={22} />
                        </button>

                        {/* Study Tools (Recall Mode) */}
                        <button
                            onClick={() => setActivePanel(activePanel === 'study' ? null : 'study')}
                            className={`p-2 rounded-full transition ${activePanel === 'study' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            <Brain size={22} />
                        </button>

                        <div className="w-px h-6 bg-white/20 mx-1"></div>

                        {/* Bookmark */}
                        <button
                            onClick={() => activeBook && toggleBookmark(activeBook.id, currentPage)}
                            className={`p-2 rounded-full transition ${isBookmarked
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Bookmark size={22} fill={isBookmarked ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className={`absolute bottom-0 left-0 right-0 pointer-events-auto transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
                <div className="bg-gradient-to-t from-black/80 to-transparent px-4 py-8 pb-10">
                    {/* Progress Bar */}
                    <div className="relative h-1 bg-white/20 rounded-full mb-3">
                        <div
                            className="absolute h-full bg-white/90 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                        <div
                            className="absolute w-3 h-3 bg-white rounded-full shadow-lg -top-1 transform -translate-x-1/2 transition-all duration-300 scale-125"
                            style={{ left: `${progress}%` }}
                        />
                    </div>

                    {/* Page Info */}
                    <div className="flex justify-between items-end text-white/90 text-sm font-medium">
                        <div className="flex flex-col">
                            <span className="text-xs text-white/60 uppercase tracking-widest font-bold mb-0.5">Progress</span>
                            <span>Page {currentPage} of {numPages} • {progress}%</span>
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-xs text-white/60 uppercase tracking-widest font-bold mb-0.5">Time Left</span>
                            <span className="flex items-center gap-1.5"><Clock size={14} /> {timeLeftString}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Typography Panel */}
            {activePanel === 'typography' && (
                <div className="absolute top-20 left-4 right-4 pointer-events-auto animate-in slide-in-from-top-2 duration-200 z-[90]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 max-w-md mx-auto border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 dark:text-white">Typography</h3>
                            <button onClick={() => setActivePanel(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Font Size */}
                        <div className="mb-5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Font Size</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                                    className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    <Minus size={18} />
                                </button>
                                <span className="flex-1 text-center font-mono font-bold text-xl">{fontSize}px</span>
                                <button
                                    onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                                    className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Font Family */}
                        <div className="mb-5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Font</label>
                            <div className="grid grid-cols-4 gap-2">
                                {fonts.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setReaderFont(f.id)}
                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${readerFont === f.id
                                            ? 'bg-indigo-500 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        style={{ fontFamily: f.id === 'System' ? 'system-ui' : f.id }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Line Height */}
                        <div className="mb-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Line Spacing</label>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-400">Compact</span>
                                <input
                                    type="range"
                                    min="1.2"
                                    max="2.4"
                                    step="0.1"
                                    value={lineHeight}
                                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <span className="text-xs text-gray-400">Relaxed</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Theme Panel */}
            {activePanel === 'theme' && (
                <div className="absolute top-20 left-4 right-4 pointer-events-auto animate-in slide-in-from-top-2 duration-200 z-[90]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 max-w-md mx-auto border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 dark:text-white">Theme</h3>
                            <button onClick={() => setActivePanel(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            {themes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setReaderTheme(t.id)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${readerTheme === t.id
                                        ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800'
                                        : 'hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: t.bg }}
                                >
                                    <span className="text-2xl">{t.icon}</span>
                                    <span className="text-xs font-medium" style={{ color: t.text }}>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Study Tools Panel (Recall Mode) */}
            {activePanel === 'study' && (
                <div className="absolute top-20 left-4 right-4 pointer-events-auto animate-in slide-in-from-top-2 duration-200 z-[90]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 max-w-md mx-auto border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Brain size={18} className="text-indigo-500" /> Study Tools
                            </h3>
                            <button onClick={() => setActivePanel(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">More study tools coming soon!</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ZenControls;
