import React, { useState, useEffect } from 'react';
import { X, Trophy, ChevronLeft, ChevronRight, Bookmark, Heart } from 'lucide-react'; // Added Icons

// Services & Store
import { generateImageBackground } from '../../services/imageGenService';
import useAppStore from '../../store/useAppStore';

// Components
import QuizCard from '../activities/QuizCard';
import TimelineGame from '../activities/TimelineGame';
import NanoFlashcard from '../activities/NanoFlashcard';
import ConceptMap from '../activities/ConceptMap';

const ActivityOverlay = ({ data, bookId, onClose }) => {
  const { addXP, addMistake, toggleFavorite, favorites } = useAppStore();
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);

  // Initialize Tasks
  const [tasks, setTasks] = useState(() => {
    const mixedTasks = (data.quiz || []).map(t => ({ ...t, type: t.type || 'mcq', bookId }));

    // --- NEW: Summary Task ---
    let summaryTasks = [];
    if (data.short_summary) {
      summaryTasks.push({
        type: 'summary',
        title: "Quick Recap",
        summary: data.short_summary
      });
    }

    const timelines = (data.timeline || []).map(t => ({ ...t, type: 'timeline', bookId }));

    let mapTasks = [];
    if (data.concept_map) {
      mapTasks.push({
        type: 'concept_map',
        title: data.concept_map.title,
        mermaid_code: data.concept_map.mermaid_code,
        bookId
      });
    }

    let visualTasks = [];
    const hasVisualInQuiz = mixedTasks.some(t => t.type === 'visual');
    if (data.visual_concept && !hasVisualInQuiz) {
      visualTasks.push({
        type: 'visual',
        question: "What concept does this image represent?",
        answer: data.summary || "Key Concept",
        image_prompt: data.visual_concept,
        imageUrl: null,
        isLoading: true,
        bookId
      });
    }

    // Order: Map -> Quiz -> Summary -> Timeline -> Visual
    const allTasks = [...mapTasks, ...mixedTasks, ...summaryTasks, ...timelines, ...visualTasks];

    // Start loading images
    allTasks.forEach(t => {
      if (t.type === 'visual' && t.image_prompt) {
        t.isLoading = true;
        t.imageUrl = null;
      }
    });

    return allTasks;
  });

  // Background Image Loader
  useEffect(() => {
    const visualTaskIndex = tasks.findIndex(t => t.type === 'visual');
    if (visualTaskIndex !== -1 && !tasks[visualTaskIndex].imageUrl) {
      const prompt = tasks[visualTaskIndex].image_prompt;
      generateImageBackground(prompt).then((url) => {
        setTasks(prev => {
          const newTasks = [...prev];
          newTasks[visualTaskIndex] = { ...newTasks[visualTaskIndex], imageUrl: url, isLoading: false };
          return newTasks;
        });
      });
    }
  }, []);

  const currentTask = tasks[step];

  // Check if current item is favorited
  const isSaved = currentTask && favorites.some(f =>
    (f.question || f.title) === (currentTask.question || currentTask.title)
  );

  const handleNext = (wasCorrect) => {
    if (wasCorrect) setScore(s => s + 10);
    else if (currentTask.type === 'mcq' || !currentTask.type) {
      addMistake(currentTask);
    }

    if (step < tasks.length - 1) {
      setStep(s => s + 1);
    } else {
      setStep('FINISH');
      if (wasCorrect) addXP(10);
    }
  };

  // --- NEW: Go Back ---
  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // --- NEW: Toggle Save ---
  const handleToggleSave = () => {
    toggleFavorite(currentTask);
    /* Simple feedback */
    // alert(isSaved ? "Removed from Favorites" : "Saved to Favorites!"); 
    // Commented out alert to avoid spam, icon color change is sufficient feedback usually.
    // If user explicitely asked to "store", the icon change confirms storage.
  };

  if (step === 'FINISH') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-white p-10 rounded-3xl text-center max-w-sm w-full shadow-2xl animate-in zoom-in">
          <div className="inline-block p-4 bg-yellow-100 rounded-full mb-4">
            <Trophy size={48} className="text-yellow-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Awesome!</h2>
          <p className="text-gray-500 mb-6">You earned {score} XP</p>
          <button onClick={onClose} className="w-full py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition">
            Resume Reading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm overflow-y-auto overflow-x-hidden">

      {/* TOP CONTROLS - Fixed to Viewport */}
      <div className="fixed top-4 left-4 z-[70] flex gap-3">
        {/* Back Button */}
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className="p-2 bg-black/40 rounded-full text-white/70 hover:text-white transition disabled:opacity-0 disabled:pointer-events-none backdrop-blur-md"
        >
          <ChevronLeft size={28} />
        </button>
      </div>

      <div className="fixed top-4 right-4 z-[70] flex gap-3">
        {/* Save/Favorite Button */}
        <button
          onClick={handleToggleSave}
          className={`p-2 rounded-full backdrop-blur-md transition ${isSaved ? 'bg-red-500/20 text-red-500' : 'bg-black/40 text-white/70 hover:text-white hover:bg-black/60'}`}
        >
          <Heart size={24} fill={isSaved ? "currentColor" : "none"} />
        </button>

        {/* Close Button */}
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full text-white/70 hover:text-white backdrop-blur-md hover:bg-black/60 transition">
          <X size={24} />
        </button>
      </div>

      {/* BOTTOM CONTROL - NEXT / SKIP */}
      <div className="fixed bottom-6 right-6 z-[70]">
        <button
          onClick={() => handleNext(false)}
          className="bg-black/80 text-white backdrop-blur-md px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-black transition shadow-lg"
        >
          {step === tasks.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={20} />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] flex gap-1.5 pointer-events-none">
        {tasks.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'w-1.5 bg-white/30'}`} />
        ))}
      </div>

      {/* MAIN CONTENT SCROLL AREA */}
      <div className="w-full max-w-5xl min-h-screen pt-20 pb-10 flex flex-col items-center justify-center px-4">
        {currentTask?.type === 'concept_map' ? (
          <ConceptMap data={currentTask} onNext={handleNext} />
        ) : currentTask?.type === 'summary' ? (
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                <Bookmark size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{currentTask.title}</h2>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed mb-8 whitespace-pre-line">{currentTask.summary}</p>
            <button onClick={() => handleNext(true)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Continue
            </button>
          </div>
        ) : currentTask?.type === 'timeline' ? (
          <TimelineGame data={currentTask} onNext={handleNext} />
        ) : currentTask?.type === 'visual' ? (
          <NanoFlashcard data={currentTask} onNext={handleNext} />
        ) : (
          <QuizCard data={currentTask} onNext={handleNext} />
        )}
      </div>
    </div>
  );
};

export default ActivityOverlay;