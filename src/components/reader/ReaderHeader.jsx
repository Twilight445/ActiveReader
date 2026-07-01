import React from 'react';
import { ArrowLeft, Moon, Sun, PenTool, X } from 'lucide-react';

const ReaderHeader = ({
  zenMode,
  activeBook,
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
      <div className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm max-w-[160px] xs:max-w-[200px] md:max-w-md flex-1 mx-3">
        {activeBook?.title}
      </div>
      <div className="flex items-center gap-0.5 md:gap-1">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleReaderDarkMode}
          className={`p-1.5 md:p-2 rounded-full transition ${readerDarkMode ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          title={readerDarkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {readerDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {/* Draw Mode Toggle */}
        <button onClick={() => setIsDrawMode(!isDrawMode)} className={`p-1.5 md:p-2 rounded-full transition ${isDrawMode ? 'bg-red-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          {isDrawMode ? <X size={18} /> : <PenTool size={18} />}
        </button>
      </div>
    </div>
  );
};

export default ReaderHeader;
