import React from 'react';
import { X } from 'lucide-react';

const DictionaryModal = ({ dictionaryData, onClose }) => {
  if (!dictionaryData) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4 md:p-0" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-black text-gray-800 capitalize">{dictionaryData.word}</h2>
            {dictionaryData.phonetic && <p className="text-gray-400 font-mono">{dictionaryData.phonetic}</p>}
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          {dictionaryData.meanings?.map((m, i) => (
            <div key={i}>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">{m.partOfSpeech}</p>
              <ul className="list-disc pl-5 space-y-2">
                {m.definitions?.slice(0, 3).map((d, j) => (
                  <li key={j} className="text-sm text-gray-700 leading-relaxed">
                    {d.definition}
                    {d.example && <p className="text-xs text-gray-400 italic mt-1">"{d.example}"</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {(!dictionaryData.meanings || dictionaryData.meanings.length === 0) && (
            <p className="text-gray-500">No definitions found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryModal;
