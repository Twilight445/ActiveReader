import React, { useState } from 'react';
import { BrainCircuit, X, Play, SkipForward, Save, ChevronDown, Loader2 } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import ActiveRecallInput from '../activities/ActiveRecallInput';

const CheckpointPrompt = ({ show, onStartActivity, onSkip, page, isGenerating, hasReadyActivities, onOpenActivity }) => {
  const { addUserSummary, activeBook } = useAppStore();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!show) return null;

  // Custom Footer renderer for ActiveRecallInput
  const renderFooter = ({ text, isSaved, handleSave, charCount }) => {
    // STATE 1: GENERATING (Background)
    if (isGenerating) {
      return (
        <div className="w-full py-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex items-center justify-center gap-3 animate-pulse">
          <BrainCircuit className="text-indigo-600 dark:text-indigo-400 animate-spin-slow" size={20} />
          <span className="text-indigo-700 dark:text-indigo-300 font-bold">Generating Activities...</span>
          <div className="w-24 h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 dark:bg-indigo-400 animate-progress-indeterminate"></div>
          </div>
        </div>
      );
    }

    // STATE 2: READY (Activities Generated)
    if (hasReadyActivities) {
      return (
        <button
          onClick={onOpenActivity}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 animate-bounce-subtle"
        >
          <Play size={20} />
          Open Activities
        </button>
      );
    }

    // STATE 3: DEFAULT (Input)
    return (
      <div className="flex flex-col gap-3">
        {/* Main Action: Generate (in background) */}
        <button
          onClick={() => {
            // Just trigger generation, don't save/lock yet so user can keep writing
            onStartActivity(true); // Pass true explicitly for background mode
          }}
          className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300
            bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5
          `}
        >
          <BrainCircuit size={20} />
          Start Activities
        </button>

        {/* Secondary Action: Save & Skip */}
        <button
          onClick={() => {
            const saved = handleSave(); // Attempt save
            if (saved) {
              setTimeout(onSkip, 500); // Wait for UI feedback then skip
            } else {
              onSkip(); // Just skip if empty/invalid
            }
          }}
          disabled={charCount < 5}
          className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
        >
          <Save size={18} />
          Save Only & Skip
        </button>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border-2 border-indigo-500 cursor-pointer hover:scale-110 transition-transform flex items-center gap-2"
        onClick={() => setIsMinimized(false)}
      >
        {isGenerating ? <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={24} /> : <BrainCircuit className="text-indigo-600 dark:text-indigo-400" size={24} />}
        {hasReadyActivities && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>}
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right duration-500">
      <div className="relative">
        {/* Header Control Container - Inside relative but moved in */}
        <div className="absolute top-2 right-2 flex gap-1 z-[60]">
          {/* Minify Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-500 hover:text-white rounded-lg text-gray-400 dark:text-gray-300 transition-all shadow-sm"
            title="Minimize"
          >
            <ChevronDown size={14} />
          </button>

          {/* Close Button */}
          <button
            onClick={onSkip}
            className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-500 hover:text-white rounded-lg text-gray-400 dark:text-gray-300 transition-all shadow-sm"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content - Smaller & Compact */}
        <div className="w-72 sm:w-80 max-h-[75vh] overflow-y-auto shadow-2xl rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800">
          <ActiveRecallInput
            bookId={activeBook?.id}
            pageNumber={page}
            customFooter={renderFooter}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckpointPrompt;