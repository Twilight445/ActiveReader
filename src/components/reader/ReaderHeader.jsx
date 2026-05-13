import React from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, Moon, Sun, PenTool, X } from 'lucide-react';

const ReaderHeader = ({
  zenMode,
  activeBook,
  scale,
  setScale,
  readerDarkMode,
  toggleReaderDarkMode,
  isDrawMode,
  setIsDrawMode,
  setScreen
}) => {
  if (zenMode) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 md:px-3 py-2 flex justify-between items-center z-20 shrink-0 shadow-sm h-12 md:h-14">
      <button onClick={() => setScreen('DASHBOARD')} className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-gray-200 transition-colors">
        <ArrowLeft size={20} />
      </button>
      <div className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm max-w-[100px] xs:max-w-[140px] md:max-w-md flex-1 mx-2">
        {activeBook?.title}
      </div>
      <div className="flex items-center gap-0.5 md:gap-1">
        <button onClick={() => setScale(s => Math.max(s - 0.2, 0.6))} className="p-1.5 md:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <ZoomOut size={18} />
        </button>
        <span className="text-xs font-mono w-8 text-center hidden md:inline-block text-gray-600 dark:text-gray-300">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={() => setScale(s => Math.min(s + 0.2, 2.5))} className="p-1.5 md:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <ZoomIn size={18} />
        </button>
        <div className="w-[1px] h-5 md:h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleReaderDarkMode}
          className={`p-1.5 md:p-2 rounded-full transition ${readerDarkMode ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          title={readerDarkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {readerDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button onClick={() => setIsDrawMode(!isDrawMode)} className={`p-1.5 md:p-2 rounded-full transition ${isDrawMode ? 'bg-red-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          {isDrawMode ? <X size={18} /> : <PenTool size={18} />}
        </button>
      </div>
    </div>
  );
};

export default ReaderHeader;
