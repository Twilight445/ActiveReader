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
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
      <div className="bg-purple-600 p-6 text-white text-center">
        <h3 className="text-xl font-bold">Timeline Challenge</h3>
        <p className="text-white/80 text-sm">Put history in order</p>
      </div>

      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {data.question || "Arrange these events from First to Last:"}
        </h2>

        <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all
                ${isSubmitted
                  ? (item.order === index + 1 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50')
                  : 'border-gray-100 bg-white hover:border-purple-200'
                }
              `}
            >
              <span className="font-bold text-gray-400 w-6">#{index + 1}</span>
              <span className="flex-1 font-medium text-sm text-gray-700">{item.label}</span>

              {/* Controls (Only show if not submitted) */}
              {!isSubmitted && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-20 text-purple-600"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-20 text-purple-600"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Button */}
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition"
          >
            Check Order
          </button>
        ) : (
          <div className={`text-center font-bold p-3 rounded-xl ${isCorrect ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
            {isCorrect ? (
              <span className="flex items-center justify-center gap-2"><CheckCircle size={20} /> Correct! Moving on...</span>
            ) : (
              <button onClick={() => { setIsSubmitted(false); }} className="flex items-center justify-center gap-2 w-full">
                <RotateCcw size={18} /> Wrong order. Try Again?
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TimelineGame;