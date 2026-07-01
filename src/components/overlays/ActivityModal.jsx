import React, { useState } from 'react';
import { X, Trophy, RefreshCw, Star, CheckCircle } from 'lucide-react';
import QuizCard from '../activities/QuizCard';
import ConceptMap from '../activities/ConceptMap';
import NanoFlashcard from '../activities/NanoFlashcard';
import useAppStore from '../../store/useAppStore';

const ActivityModal = ({ activity, bookId, onClose }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [successScore, setSuccessScore] = useState(0);
  const { addXP } = useAppStore();

  if (!activity) return null;

  const handleNext = (wasCorrect) => {
    if (wasCorrect) {
      setSuccessScore(prev => prev + 10);
      addXP(5); // Small reward for replaying!
    }
    setIsCompleted(true);
  };

  const handleReset = () => {
    setIsCompleted(false);
    setSuccessScore(0);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300 select-none">
      
      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-[120]">
        <button 
          onClick={onClose} 
          className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full text-white/80 hover:text-white transition-all shadow-lg border border-white/15"
          title="Exit Replay"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-2xl flex flex-col items-center justify-center relative">
        {isCompleted ? (
          /* Premium Completion/Success State Card */
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950/95 text-white p-8 sm:p-12 rounded-3xl text-center w-full max-w-md shadow-2xl border border-indigo-500/30 animate-in zoom-in-95 duration-300">
            <div className="inline-block p-5 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-400/20 mb-6 animate-bounce-subtle">
              <Trophy size={56} className="text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
            </div>
            
            <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-400 mb-2">
              Review Completed!
            </h2>
            
            <p className="text-slate-400 font-medium mb-6 text-sm">
              Great job reinforcing your memory and reviewing this concept!
            </p>

            <div className="bg-indigo-900/40 rounded-2xl p-4 border border-indigo-500/20 mb-8 flex items-center justify-center gap-6">
              <div className="text-center">
                <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest">Bonus</span>
                <span className="text-xl font-black text-amber-300">+5 XP</span>
              </div>
              <div className="w-[1px] h-8 bg-indigo-500/20" />
              <div className="text-center">
                <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest">Status</span>
                <span className="text-xl font-black text-emerald-400 flex items-center gap-1 justify-center">
                  <CheckCircle size={18} /> Mastered
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleReset} 
                className="flex-1 py-3 px-5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 border border-white/10"
              >
                <RefreshCw size={16} /> Try Again
              </button>
              
              <button 
                onClick={onClose} 
                className="flex-1 py-3 px-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-500/20"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Render the Specific Interactive Activity Component */
          <div className="w-full flex justify-center transform scale-95 sm:scale-100 transition-transform">
            {activity.type === 'concept_map' ? (
              <ConceptMap data={activity} onNext={() => handleNext(true)} />
            ) : activity.type === 'visual' ? (
              <NanoFlashcard data={activity} onNext={handleNext} />
            ) : (
              <QuizCard data={activity} onNext={handleNext} />
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default ActivityModal;
