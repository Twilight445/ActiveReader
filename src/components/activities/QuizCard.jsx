import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const QuizCard = ({ data, onNext }) => {
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  // Reset state when new question arrives
  useEffect(() => {
    setSelected(null);
    setIsCorrect(null);
  }, [data]);

  // --- CRASH PREVENTION ---
  // If the AI sends bad data (no question or no options), we skip it safely.
  if (!data || !data.options || !Array.isArray(data.options)) {
    console.warn("⚠️ Invalid Quiz Data detected:", data);
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-3xl text-center shadow-xl">
        <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={40} />
        <h3 className="text-gray-800 font-bold">Skipping invalid question...</h3>
        <p className="text-gray-500 text-sm mb-4">The AI generated a question format we didn't recognize.</p>
        <button
          onClick={() => onNext(true)} // Auto-skip as "correct" so flow continues
          className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-bold hover:bg-gray-300"
        >
          Next Question
        </button>
      </div>
    );
  }
  // ------------------------

  const handleSelect = (option) => {
    if (selected) return;
    setSelected(option);

    // Loose matching for robustness
    const correct =
      option === data.answer ||
      (data.answer && option.toLowerCase().startsWith(data.answer.toLowerCase()));

    setIsCorrect(correct);

    setTimeout(() => {
      onNext(correct);
    }, 1500);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="bg-accent p-6 text-white text-center">
        <h3 className="text-xl font-bold">Quick Check</h3>
        <p className="text-white/80 text-sm">Test your retention</p>
      </div>

      <div className="p-8 max-h-[60vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 leading-relaxed">
          {data.question}
        </h2>

        <div className="space-y-3">
          {data.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              className={`w-full p-4 rounded-xl text-left border-2 transition-all flex justify-between items-center relative
                ${selected === null
                  ? 'border-gray-200 hover:border-accent hover:bg-orange-50'
                  : selected === opt
                    ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')
                    : 'border-gray-100 text-gray-400 opacity-50'
                }
              `}
            >
              <span className="font-medium pr-8">{opt}</span>
              {selected === opt && (
                <div className="absolute right-4">
                  {isCorrect ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;