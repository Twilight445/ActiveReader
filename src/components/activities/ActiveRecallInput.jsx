import React, { useState, useRef, useEffect } from 'react';
import { Save, Sparkles, Check } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

/**
 * ActiveRecallInput - A premium text editor for user-generated summaries
 * Features auto bullet-point insertion and beautiful styling
 */
const ActiveRecallInput = ({ bookId, pageNumber, onComplete, customFooter }) => {
    const [text, setText] = useState('• ');
    const [isSaved, setIsSaved] = useState(false);
    const [charCount, setCharCount] = useState(0);
    const textareaRef = useRef(null);
    const addUserSummary = useAppStore((state) => state.addUserSummary);

    // Focus textarea on mount
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            // Move cursor to end
            textareaRef.current.setSelectionRange(text.length, text.length);
        }
    }, []);

    // Update char count
    useEffect(() => {
        setCharCount(text.replace(/[•\-\s]/g, '').length);
    }, [text]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Add new bullet point on Enter
            setText(prev => prev + '\n• ');

            // Scroll to bottom of textarea
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            }, 0);
        }

        // Handle Backspace at the start of a bullet line
        if (e.key === 'Backspace') {
            const cursorPos = textareaRef.current?.selectionStart;
            const beforeCursor = text.substring(0, cursorPos);

            // If we're right after a bullet point marker, remove the whole line marker
            if (beforeCursor.endsWith('\n• ') || (beforeCursor === '• ' && cursorPos === 2)) {
                e.preventDefault();
                if (beforeCursor === '• ') {
                    // Don't remove the first bullet
                    return;
                }
                // Remove the newline and bullet
                setText(prev => prev.substring(0, cursorPos - 3) + prev.substring(cursorPos));
            }
        }
    };

    const handleSave = () => {
        if (text.trim() === '•' || text.trim().length < 5) {
            return false; // Failed validation
        }

        addUserSummary(text, pageNumber, bookId);
        setIsSaved(true);

        // Auto-complete after brief delay
        setTimeout(() => {
            if (onComplete) onComplete(true);
        }, 1500);
        return true; // Success
    };

    return (
        <div className="w-full max-w-lg animate-in fade-in zoom-in duration-300">
            {/* Header - Compact */}
            <div className="text-center mb-3">
                <div className="inline-flex items-center justify-center p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg mb-2">
                    <Sparkles size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Active Recall</h2>
                <p className="text-white/70 text-xs">What do you remember?</p>
            </div>

            {/* Input Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300">
                {/* Textarea Container */}
                <div className="p-4 pb-3">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="• Start typing what you remember..."
                        disabled={isSaved}
                        className={`w-full h-32 p-4 border-2 rounded-2xl resize-none font-medium text-gray-700 dark:text-gray-200 leading-relaxed
              transition-all duration-300 outline-none text-sm
              ${isSaved
                                ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-700 cursor-not-allowed'
                                : 'border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:border-emerald-400 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/50'
                            }
            `}
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    />

                    {/* Character Counter */}
                    <div className="flex justify-between items-center mt-3 px-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded text-gray-500 dark:text-gray-300 font-mono text-[10px]">Enter</kbd> for new bullet
                        </span>
                        <span className={`text-xs font-medium ${charCount > 20 ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}>
                            {charCount} characters
                        </span>
                    </div>
                </div>

                {/* Action Button - Custom or Default */}
                <div className="px-4 pb-4">
                    {customFooter ? (
                        customFooter({ text, isSaved, handleSave, charCount })
                    ) : (
                        !isSaved ? (
                            <button
                                onClick={handleSave}
                                disabled={charCount < 5}
                                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300
                                    ${charCount >= 5
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                <Save size={20} />
                                Save My Notes
                            </button>
                        ) : (
                            <div className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-emerald-100 text-emerald-600">
                                <Check size={20} />
                                Saved! Great work!
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Skip Option */}
            {!isSaved && (
                <button
                    onClick={() => onComplete && onComplete(false)}
                    className="w-full mt-4 py-3 text-white/60 hover:text-white/90 font-medium transition-colors"
                >
                    Skip for now
                </button>
            )}
        </div>
    );
};

export default ActiveRecallInput;
