import React, { useState, useEffect } from 'react';
import { X, Trophy, ChevronLeft, Bookmark, Heart } from 'lucide-react'; // Added Icons

// Services & Store
import { generateImageBackground } from '../../services/imageGenService';
import useAppStore from '../../store/useAppStore';

// Components
import QuizCard from '../activities/QuizCard';
import TimelineGame from '../activities/TimelineGame';
import NanoFlashcard from '../activities/NanoFlashcard';
import ConceptMap from '../activities/ConceptMap';

const ActivityOverlay = ({ data, onClose }) => {
  const { addXP, addMistake, toggleFavorite, favorites } = useAppStore();
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);

  // Initialize Tasks
  const [tasks, setTasks] = useState(() => {
    const mixedTasks = (data.quiz || []).map(t => ({ ...t, type: t.type || 'mcq' }));
    const timelines = (data.timeline || []).map(t => ({ ...t, type: 'timeline' }));

    let mapTasks = [];
    if (data.concept_map) {
      mapTasks.push({
        type: 'concept_map',
        title: data.concept_map.title,
        mermaid_code: data.concept_map.mermaid_code
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
        isLoading: true
      });
    }

    const allTasks = [...mapTasks, ...mixedTasks, ...timelines, ...visualTasks];

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">

      {/* TOP CONTROLS */}
      <div className="absolute top-6 left-6 flex gap-4">
        {/* Back Button */}
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className="text-white/50 hover:text-white transition disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={32} />
        </button>
      </div>

      <div className="absolute top-6 right-6 flex gap-4">
        {/* Save/Favorite Button */}
        <button
          onClick={handleToggleSave}
          className={`transition transform hover:scale-110 ${isSaved ? 'text-red-500' : 'text-white/50 hover:text-white'}`}
          title="Save to Favorites"
        >
          <Heart size={32} fill={isSaved ? "currentColor" : "none"} />
        </button>

        {/* Close Button */}
        <button onClick={onClose} className="text-white/50 hover:text-white transition">
          <X size={32} />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 flex gap-2">
        {tasks.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-accent' : 'w-2 bg-white/20'}`} />
        ))}
      </div>

      {/* COMPONENT SWITCHER */}
      {currentTask?.type === 'concept_map' ? (
        <ConceptMap data={currentTask} onNext={handleNext} />
      ) : currentTask?.type === 'timeline' ? (
        <TimelineGame data={currentTask} onNext={handleNext} />
      ) : currentTask?.type === 'visual' ? (
        <NanoFlashcard data={currentTask} onNext={handleNext} />
      ) : (
        <QuizCard data={currentTask} onNext={handleNext} />
      )}
    </div>
  );
};

export default ActivityOverlay;