import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, CheckCircle, RotateCcw } from 'lucide-react';

const TimelineGame = ({ data, onNext }) => {
  const [items, setItems] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Initialize: Shuffle the correct order to make it a challenge
  useEffect(() => {
    if (data && data.events) {
      const shuffled = [...data.events].sort(() => Math.random() - 0.5);
      setItems(shuffled);
      setIsSubmitted(false);
    }
  }, [data]);

  // Handle moving items up/down
  const moveItem = (index, direction) => {
    if (isSubmitted) return;
    const newItems = [...items];
    const targetIndex = index + direction;

    // Boundary check
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  const handleSubmit = () => {
    // Check if the current order matches the 'order' property (1, 2, 3...)
    const currentOrder = items.map(i => i.order);
    const sortedOrder = [...items].map(i => i.order).sort((a, b) => a - b);

    // Compare arrays
    const correct = JSON.stringify(currentOrder) === JSON.stringify(sortedOrder);

    setIsSubmitted(true);
    setIsCorrect(correct);

    // Auto Advance if correct
    if (correct) {
      setTimeout(() => onNext(true), 2000);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 flex flex-col max-h-[85vh]">
      {/* Header - Fixed */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white text-center shrink-0">
        <h3 className="text-xl font-bold">Timeline Challenge</h3>
        <p className="text-white/80 text-sm">Put history in order</p>
      </div>

      {/* Content Area - Flexible */}
      <div className="p-6 flex flex-col flex-1 min-h-0">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 shrink-0">
          {data.question || "Arrange these events from First to Last:"}
        </h2>

        {/* Scrollable Events Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-50 min-h-0">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200
                ${isSubmitted
                  ? (item.order === index + 1 ? 'border-green-300 bg-green-50 shadow-sm' : 'border-red-300 bg-red-50 shadow-sm')
                  : 'border-gray-100 bg-white hover:border-purple-300 hover:shadow-md'
                }
              `}
            >
              <span className="font-bold text-gray-400 w-6">#{index + 1}</span>
              <span className="flex-1 font-medium text-sm text-gray-700 px-2">{item.label}</span>

              {/* Controls (Only show if not submitted) */}
              {!isSubmitted && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 hover:bg-purple-100 rounded-lg disabled:opacity-20 text-purple-600 transition-colors"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    className="p-1.5 hover:bg-purple-100 rounded-lg disabled:opacity-20 text-purple-600 transition-colors"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sticky Action Button - Always Visible */}
        <div className="shrink-0 pt-4 border-t border-gray-100">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Check Order
            </button>
          ) : (
            <div className={`text-center font-bold p-3.5 rounded-xl ${isCorrect ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
              {isCorrect ? (
                <span className="flex items-center justify-center gap-2"><CheckCircle size={20} /> Correct! Moving on...</span>
              ) : (
                <button onClick={() => { setIsSubmitted(false); }} className="flex items-center justify-center gap-2 w-full hover:scale-105 transition-transform">
                  <RotateCcw size={18} /> Wrong order. Try Again?
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineGame;