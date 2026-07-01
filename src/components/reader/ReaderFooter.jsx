import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const ReaderFooter = ({
  zenMode,
  numPages,
  currentPage,
  showScrubber,
  scrubberValue,
  handleScrubberChange,
  handleScrubberCommit,
  showGoToPage,
  setShowGoToPage,
  goToPageInput,
  setGoToPageInput,
  updateBookProgress,
  manualChapterMode,
  handleStartActivity,
  onScrubberInteract,
}) => {
  if (zenMode) return null;

  const displayPage = scrubberValue !== null ? scrubberValue : currentPage;
  const progress = numPages ? ((currentPage - 1) / (numPages - 1)) * 100 : 0;

  return (
    <>
      {/* Thin progress bar — always visible at very bottom */}
      <div className="h-0.5 bg-gray-200 dark:bg-gray-700 shrink-0 relative z-30">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Auto-hidden Scrubber Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out ${
          showScrubber ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-700/60 px-4 py-3 shadow-2xl">

          {/* Page scrubber slider */}
          {numPages > 1 && (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-6 text-right">1</span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="1"
                  max={numPages}
                  value={displayPage}
                  onInput={handleScrubberChange}
                  onChange={handleScrubberChange}
                  onMouseUp={handleScrubberCommit}
                  onTouchEnd={handleScrubberCommit}
                  onMouseDown={onScrubberInteract}
                  onTouchStart={onScrubberInteract}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-8">{numPages}</span>
            </div>
          )}

          {/* Page counter — tappable to open Go To Page */}
          <div className="flex justify-center items-center gap-3">
            <button
              onClick={() => {
                setGoToPageInput(String(currentPage));
                setShowGoToPage(true);
              }}
              className="font-mono text-sm font-bold bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-5 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Tap to jump to page"
            >
              {displayPage} / {numPages || '--'}
            </button>
          </div>

          {/* Manual Chapter Finish Button */}
          {manualChapterMode && (
            <button
              onClick={() => handleStartActivity('CHAPTER_END')}
              className="w-full mt-2 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex justify-center items-center gap-2"
            >
              <CheckCircle2 size={18} /> Finish Chapter & Quiz
            </button>
          )}
        </div>
      </div>

      {/* Go to Page Modal */}
      {showGoToPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowGoToPage(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Go to Page</h3>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max={numPages || 1}
                value={goToPageInput}
                onChange={(e) => setGoToPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt(goToPageInput);
                    if (page >= 1 && page <= numPages) {
                      updateBookProgress(page, numPages);
                      setShowGoToPage(false);
                    }
                  }
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
              />
              <button
                onClick={() => {
                  const page = parseInt(goToPageInput);
                  if (page >= 1 && page <= numPages) {
                    updateBookProgress(page, numPages);
                    setShowGoToPage(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
              >
                Go
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Enter a page number (1-{numPages})
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ReaderFooter;
