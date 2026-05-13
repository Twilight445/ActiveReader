import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

const ReaderFooter = ({
  zenMode,
  numPages,
  currentPage,
  sliderValue,
  handleSliderChange,
  handleSliderCommit,
  updateBookProgress,
  showGoToPage,
  setShowGoToPage,
  goToPageInput,
  setGoToPageInput,
  manualChapterMode,
  handleStartActivity
}) => {
  if (zenMode) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-3 shrink-0 z-20">

      {/* Page Scroller Slider */}
      {numPages > 1 && (
        <div className="flex items-center gap-3 px-2">
          <span className="text-xs font-mono text-gray-400">1</span>
          <input
            type="range"
            min="1"
            max={numPages}
            value={sliderValue !== null ? sliderValue : currentPage}
            onInput={handleSliderChange}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-xs font-mono text-gray-400">{numPages}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button onClick={() => updateBookProgress(currentPage - 1, numPages)} disabled={currentPage <= 1} className="flex items-center gap-1 text-gray-700 dark:text-gray-200 disabled:opacity-30 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft size={20} /> <span className="hidden md:inline font-bold">Prev</span>
        </button>

        {/* Clickable Page Number - Opens Go to Page */}
        <button
          onClick={() => {
            setGoToPageInput(String(currentPage));
            setShowGoToPage(true);
          }}
          className="font-mono text-sm font-bold bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-4 py-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          title="Click to jump to page"
        >
          {sliderValue !== null ? sliderValue : currentPage} / {numPages || '--'}
        </button>

        <button onClick={() => updateBookProgress(currentPage + 1, numPages)} disabled={currentPage >= numPages} className="flex items-center gap-1 text-gray-700 dark:text-gray-200 disabled:opacity-30 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <span className="hidden md:inline font-bold">Next</span> <ChevronRight size={20} />
        </button>
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
  );
};

export default ReaderFooter;
