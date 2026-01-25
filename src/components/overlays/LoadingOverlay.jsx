import React, { useState, useEffect } from 'react';
import { BrainCircuit, Sparkles, BookOpen } from 'lucide-react';

const messages = [
  "Reading your textbook...",
  "Finding key dates & events...",
  "Generating a challenge...",
  "Preparing visual mnemonics...",
  "Almost ready..."
];

const LoadingOverlay = () => {
  const [msgIndex, setMsgIndex] = useState(0);

  // Cycle through messages every 1.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">

      {/* Animated Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
        <div className="bg-white p-6 rounded-full shadow-2xl relative animate-bounce">
          <BrainCircuit size={48} className="text-indigo-600" />
        </div>

        {/* Floating Sparkles */}
        <Sparkles size={24} className="text-yellow-400 absolute -top-2 -right-2 animate-spin-slow" />
        <BookOpen size={24} className="text-blue-400 absolute -bottom-2 -left-2 animate-pulse" />
      </div>

      {/* Text */}
      <h2 className="text-2xl font-bold text-white mb-2">AI is Thinking...</h2>
      <p className="text-white/70 text-lg font-mono min-h-[30px] transition-all duration-500">
        {messages[msgIndex]}
      </p>

      {/* Progress Bar (Fake but satisfying) */}
      <div className="w-64 h-2 bg-gray-800 rounded-full mt-8 overflow-hidden">
        <div className="h-full bg-indigo-500 animate-progress-indeterminate"></div>
      </div>

      <style>{`
        @keyframes progress-indeterminate {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 70%; margin-left: 30%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;