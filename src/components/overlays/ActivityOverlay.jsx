import React, { useState, useEffect } from 'react';
import { X, Trophy, ChevronLeft, ChevronRight, Bookmark, Heart } from 'lucide-react'; // Added Icons

// Services & Store
import { generateImageBackground } from '../../services/imageGenService';
import useAppStore from '../../store/useAppStore';
import useSettingsStore from '../../store/useSettingsStore';

// Components
import QuizCard from '../activities/QuizCard';
import TimelineGame from '../activities/TimelineGame';
import NanoFlashcard from '../activities/NanoFlashcard';
import ConceptMap from '../activities/ConceptMap';

const ActivityOverlay = ({ data, bookId, onClose }) => {
  const { addXP, addMistake, toggleFavorite, favorites } = useAppStore();
  const { enableTimeline } = useSettingsStore();

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

    const timelines = (enableTimeline && data.timeline) ? (data.timeline || []).map(t => ({ ...t, type: 'timeline', bookId })) : [];

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
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start py-8 px-4">

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
          <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-300">
            {/* Summary Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4">
                <Bookmark size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{currentTask.title || "Quick Recap"}</h2>
              <p className="text-white/70">Key insights from your reading</p>
            </div>

            {/* Summary Cards Grid */}
            <div className="space-y-4 mb-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
              {(() => {
                // Parse summary into categories
                const lines = currentTask.summary.split('\n').filter(l => l.trim());
                const dates = [];
                const facts = [];
                const events = [];

                lines.forEach(line => {
                  const trimmed = line.trim().replace(/^[-*•]\s*/, '');
                  // Check for dates (years, specific dates)
                  if (/\b(1[0-9]{3}|2[0-9]{3})\b/.test(trimmed) || /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(trimmed)) {
                    dates.push(trimmed);
                  } else if (trimmed.toLowerCase().includes('event') || trimmed.toLowerCase().includes('war') || trimmed.toLowerCase().includes('battle') || trimmed.toLowerCase().includes('movement')) {
                    events.push(trimmed);
                  } else if (trimmed.length > 5) {
                    facts.push(trimmed);
                  }
                });

                // If no categorization worked, put all in facts
                if (dates.length === 0 && events.length === 0) {
                  lines.forEach(l => facts.push(l.trim().replace(/^[-*•]\s*/, '')));
                }

                return (
                  <>
                    {/* Key Dates Card */}
                    {dates.length > 0 && (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/80 p-5 rounded-2xl border border-blue-200/50 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-500 rounded-xl">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-blue-800 text-lg">Key Dates</h3>
                        </div>
                        <ul className="space-y-2">
                          {dates.slice(0, 5).map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-blue-900">
                              <span className="text-blue-400 mt-1">•</span>
                              <span className="text-sm leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Important Facts Card */}
                    {facts.length > 0 && (
                      <div className="bg-gradient-to-br from-amber-50 to-orange-100/80 p-5 rounded-2xl border border-amber-200/50 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-amber-500 rounded-xl">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-amber-800 text-lg">Important Facts</h3>
                        </div>
                        <ul className="space-y-2">
                          {facts.slice(0, 6).map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-amber-900">
                              <span className="text-amber-400 mt-1">•</span>
                              <span className="text-sm leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key Events Card */}
                    {events.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-violet-100/80 p-5 rounded-2xl border border-purple-200/50 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-purple-500 rounded-xl">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-purple-800 text-lg">Key Events</h3>
                        </div>
                        <ul className="space-y-2">
                          {events.slice(0, 5).map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-purple-900">
                              <span className="text-purple-400 mt-1">•</span>
                              <span className="text-sm leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Continue Button */}
            <button
              onClick={() => handleNext(true)}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
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