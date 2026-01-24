import React, { useState } from 'react';
import { Eye, Check, Loader2 } from 'lucide-react';

const NanoFlashcard = ({ data, onNext }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleReveal = () => setIsFlipped(true);
  const handleContinue = () => onNext(true);

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-500">
      <div className="bg-indigo-600 p-6 text-white text-center">
        <h3 className="text-xl font-bold">Visual Memory</h3>
        <p className="text-white/80 text-sm">Gemini is drawing...</p>
      </div>

      <div className="p-6 flex flex-col items-center">
        
        {/* IMAGE CONTAINER */}
        <div className="relative w-full h-64 bg-gray-100 rounded-2xl mb-6 overflow-hidden border-4 border-indigo-100 flex items-center justify-center">
            
            {/* Logic: Show Loader if isLoading is true */}
            {data.isLoading ? (
              <div className="text-center text-indigo-400">
                 <Loader2 size={40} className="animate-spin mx-auto mb-2" />
                 <p className="text-xs font-bold uppercase tracking-wider">Generating Art...</p>
              </div>
            ) : (
              <img 
                src={data.imageUrl} // <--- Uses the Blob URL from Hugging Face
                alt="Mnemonic" 
                className="w-full h-full object-cover animate-in fade-in duration-700"
              />
            )}
            
            {/* Overlay Prompt Text */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs text-center">
               {data.image_prompt.slice(0, 60)}...
            </div>
        </div>

        {/* Interaction Area (Disable if loading) */}
        {!isFlipped ? (
          <div className="text-center space-y-4 w-full">
            <h2 className="text-lg font-bold text-gray-800">
              {data.question}
            </h2>
            <button 
              onClick={handleReveal}
              disabled={data.isLoading} // Cannot reveal if image isn't ready
              className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition"
            >
              <Eye size={20} /> {data.isLoading ? "Waiting for Image..." : "Reveal Answer"}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4 w-full animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
              <p className="text-sm text-gray-500 uppercase font-bold">Answer</p>
              <p className="text-xl font-bold text-green-700">{data.answer}</p>
            </div>
            <button 
              onClick={handleContinue}
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition"
            >
              <Check size={20} /> Got it!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NanoFlashcard;