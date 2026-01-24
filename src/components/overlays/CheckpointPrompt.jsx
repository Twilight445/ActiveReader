import React, { useState } from 'react';
import { BrainCircuit, X, Play, SkipForward, Save } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

const CheckpointPrompt = ({ show, onStartActivity, onSkip, page }) => {
  const [summary, setSummary] = useState('');
  const { addUserSummary, activeBook } = useAppStore();

  if (!show) return null;

  const handleSaveSummaryOnly = () => {
    if (summary.trim()) {
      addUserSummary(summary, page, activeBook?.id);
      alert("Summary Saved!");
      setSummary(''); // Clear input but stay on prompt? Or close?
      // User likely wants to save then maybe skip or play. 
      // Let's keep it open or clear it. Let's just alert for now.
    }
  };

  const handlePlay = () => {
    if (summary.trim()) addUserSummary(summary, page, activeBook?.id);
    onStartActivity();
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-right duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-2xl border-l-8 border-indigo-600 w-80 relative">
        
        <button onClick={onSkip} className="absolute top-2 right-2 text-gray-300 hover:text-gray-500"><X size={18} /></button>

        <div className="flex items-center gap-3 mb-3">
          <div className="bg-indigo-100 p-2 rounded-lg"><BrainCircuit className="text-indigo-600" size={24} /></div>
          <div><h3 className="font-bold text-gray-800">Checkpoint!</h3><p className="text-xs text-gray-500">Active Recall Time</p></div>
        </div>

        <p className="text-sm text-gray-600 mb-2 font-medium">Summarize the last few pages:</p>
        <textarea
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4"
          rows="3"
          placeholder="e.g., The main causes were..."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={handleSaveSummaryOnly} disabled={!summary.trim()} className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition flex items-center justify-center gap-1 disabled:opacity-50">
              <Save size={14} /> Save Only
            </button>
            <button onClick={onSkip} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition flex items-center justify-center gap-1">
              <SkipForward size={14} /> Skip All
            </button>
          </div>
          
          <button onClick={handlePlay} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1 shadow-md">
            <Play size={14} /> {summary.trim() ? "Save & Play Quiz" : "Play Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckpointPrompt;