import React, { useRef, useState, useEffect } from 'react';
import { Book, Plus, Trophy, Flame, Trash2, UploadCloud, BrainCircuit, X, Heart, Moon, Sun, Highlighter, FileText, Smartphone, Cloud, Loader2, RefreshCw, Settings, Image as ImageIcon } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

// Activity Components
import QuizCard from '../activities/QuizCard';
import NanoFlashcard from '../activities/NanoFlashcard';
import ConceptMap from '../activities/ConceptMap';
import SettingsOverlay from '../overlays/SettingsOverlay';

const Dashboard = () => {
  const {
    xp, level, streak, library, mistakes, favorites, highlights, userSummaries, gallery, darkMode,
    addBookToLibrary, uploadToCloud, syncCloudLibrary, openBook, deleteBook, resolveMistake, addXP, toggleFavorite, toggleDarkMode, deleteHighlight, deleteUserSummary, deleteFromGallery, isUploading, isSyncing
  } = useAppStore();

  const [viewMode, setViewMode] = useState(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [notebookTab, setNotebookTab] = useState('summaries');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleLocalUpload = (e) => {
    if (e.target.files[0]) addBookToLibrary(e.target.files[0]);
  };

  const handleCloudUpload = (e) => {
    if (e.target.files[0]) uploadToCloud(e.target.files[0]);
  };

  const handleOpen = (book) => {
    openBook(book.id);
  };

  // Review & Scrapbook Logic
  const handleReviewAnswer = (isCorrect) => {
    if (isCorrect) { resolveMistake(mistakes[reviewIndex].question); addXP(5); }
    if (reviewIndex < mistakes.length - 1) setReviewIndex(i => i + 1);
    else { setViewMode(null); setReviewIndex(0); }
  };
  const handleNextFavorite = () => {
    if (reviewIndex < favorites.length - 1) setReviewIndex(i => i + 1);
    else { setViewMode(null); setReviewIndex(0); }
  };
  const renderFavoriteItem = (item) => {
    const commonProps = { data: item, onNext: handleNextFavorite };
    if (item.type === 'concept_map') return <ConceptMap {...commonProps} />;
    if (item.type === 'visual') return <NanoFlashcard {...commonProps} />;
    return <QuizCard {...commonProps} />;
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

      {/* HEADER */}
      <header className={`sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm backdrop-blur-md ${darkMode ? 'bg-gray-900/90 border-b border-gray-800' : 'bg-white/90 border-b border-gray-200'}`}>
        <div><h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2"><Book className="text-indigo-500" /> SOCSCI FLOW</h1></div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-700'}`}><Flame size={14} /> <span>{streak}</span></div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}><Trophy size={14} /> <span>{level}</span></div>
          </div>
          <button onClick={() => setShowSettings(true)} className={`p-2 rounded-full transition ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Settings size={20} /></button>
          <button onClick={toggleDarkMode} className={`p-2 rounded-full transition ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
        </div>
      </header>

      {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}

      <main className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 pb-20">

        {/* --- LIBRARY SECTION --- */}
        <section>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <h2 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <Book size={20} /> Your Books
              </h2>
              {/* SYNC BUTTON */}
              <button
                onClick={syncCloudLibrary}
                disabled={isSyncing}
                className={`p-2 rounded-full transition ${isSyncing ? 'animate-spin bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-500'}`}
                title="Sync with Cloud"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <div className="flex gap-2">
              {/* LOCAL UPLOAD */}
              <label className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}>
                <Smartphone size={14} /> Local
                <input type="file" accept=".pdf" onChange={handleLocalUpload} className="hidden" />
              </label>

              {/* CLOUD UPLOAD */}
              <label className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}`}>
                {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Cloud size={14} />}
                {isUploading ? '...' : 'Cloud'}
                <input type="file" accept=".pdf" onChange={handleCloudUpload} className="hidden" disabled={isUploading} />
              </label>
            </div>
          </div>

          {library.length === 0 ? (
            <div className={`p-8 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
              <p>No books found. Use the buttons above to add one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {library.map((book) => (
                <div key={book.id} onClick={() => handleOpen(book)} className={`cursor-pointer p-4 rounded-2xl shadow-sm border relative group transition-all hover:scale-[1.02] active:scale-95 ${darkMode ? 'bg-gray-900 border-gray-800 hover:border-indigo-500' : 'bg-white border-gray-100 hover:border-indigo-300'}`}>

                  {/* Type Badge */}
                  <div className={`absolute top-3 right-3 p-1.5 rounded-full z-10 ${book.type === 'CLOUD' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                    {book.type === 'CLOUD' ? <Cloud size={14} /> : <Smartphone size={14} />}
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className={`w-14 h-18 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                      <Book size={20} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className={`font-bold truncate text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{book.title}</h3>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${(book.progress / (book.totalPages || 1)) * 100}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{Math.round((book.progress / (book.totalPages || 1)) * 100)}% Complete</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }} className="flex-1 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition">Delete</button>
                    <button className={`flex-[2] py-2 rounded-lg text-xs font-bold transition ${darkMode ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-white'}`}>Open Book</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* --- NOTEBOOK & ACTIONS --- */}
        {(userSummaries.length > 0 || highlights.length > 0 || gallery.length > 0) && (
          <section className={`rounded-3xl border overflow-hidden shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button onClick={() => setNotebookTab('summaries')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${notebookTab === 'summaries' ? (darkMode ? 'bg-gray-800 text-white border-b-2 border-indigo-500' : 'bg-gray-50 text-gray-900 border-b-2 border-indigo-500') : 'text-gray-500'}`}><FileText size={16} /> Summaries</button>
              <button onClick={() => setNotebookTab('highlights')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${notebookTab === 'highlights' ? (darkMode ? 'bg-gray-800 text-white border-b-2 border-indigo-500' : 'bg-gray-50 text-gray-900 border-b-2 border-indigo-500') : 'text-gray-500'}`}><Highlighter size={16} /> Highlights</button>
              <button onClick={() => setNotebookTab('gallery')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${notebookTab === 'gallery' ? (darkMode ? 'bg-gray-800 text-white border-b-2 border-indigo-500' : 'bg-gray-50 text-gray-900 border-b-2 border-indigo-500') : 'text-gray-500'}`}><ImageIcon size={16} /> Gallery</button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {notebookTab === 'summaries' && (
                userSummaries.length === 0 ? <p className="text-center text-gray-500 text-sm">No summaries yet.</p> :
                  <div className="space-y-3">{userSummaries.map((item) => (<div key={item.id} className={`p-3 rounded-xl border relative ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}><p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.summary}</p><div className="flex justify-between items-center mt-2"><span className="text-xs font-bold text-indigo-500">Page {item.page}</span><button onClick={() => deleteUserSummary(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button></div></div>))}</div>
              )}
              {notebookTab === 'highlights' && (
                highlights.length === 0 ? <p className="text-center text-gray-500 text-sm">No highlights yet.</p> :
                  <div className="space-y-3">{highlights.map((item) => (<div key={item.id} className={`p-3 rounded-xl border relative ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}><p className={`text-sm italic ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>"{item.text}"</p><div className="flex justify-between items-center mt-2"><span className="text-xs font-bold" style={{ color: item.color }}>Page {item.page}</span><button onClick={() => deleteHighlight(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button></div></div>))}</div>
              )}
              {notebookTab === 'gallery' && (
                gallery.length === 0 ? <p className="text-center text-gray-500 text-sm">No images generated yet.</p> :
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gallery.map(img => (
                      <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        {img.status === 'success' ? (
                          <img src={img.url} className="w-full h-full object-cover" alt={img.prompt} />
                        ) : img.status === 'error' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-2 text-center"><X size={24} /><span className="text-xs">Failed</span></div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-indigo-500"><Loader2 className="animate-spin" size={24} /><span className="text-xs mt-1">Generating...</span></div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <a href={img.url} target="_blank" rel="noreferrer" className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white"><ImageIcon size={16} /></a>
                          <button onClick={() => deleteFromGallery(img.id)} className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white"><Trash2 size={16} /></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-[10px] text-white truncate px-2 backdrop-blur-sm">
                          {img.prompt}
                        </div>
                      </div>
                    ))}
                  </div>
              )}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Review & Practice</h2>
          <div className={`w-full p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px] ${mistakes.length > 0 ? 'bg-gradient-to-r from-red-600 to-pink-700 text-white' : (darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-100 text-gray-400')}`}>
            <div className="relative z-10"><h2 className="text-lg font-bold mb-1 flex items-center gap-2"><BrainCircuit size={20} /> Repair Weaknesses</h2><p className={`text-sm mb-4 ${mistakes.length > 0 ? 'text-white/90' : 'opacity-60'}`}>{mistakes.length > 0 ? `${mistakes.length} concepts need review.` : "No weaknesses detected."}</p>{mistakes.length > 0 && (<button onClick={() => { setViewMode('WEAKNESS'); setReviewIndex(0); }} className="bg-white text-red-600 px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-red-50 transition w-full md:w-auto">Start Repair</button>)}</div><BrainCircuit className="absolute -right-6 -bottom-6 opacity-10 w-40 h-40" />
          </div>
        </section>
      </main>

      {/* --- MODAL --- */}
      {viewMode && (<div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"><button onClick={() => setViewMode(null)} className="absolute top-4 right-4 text-white/50 hover:text-white p-2"><X size={28} /></button><div className="w-full max-w-lg flex flex-col items-center"><h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">{viewMode === 'WEAKNESS' ? <BrainCircuit className="text-red-500" /> : <Heart className="text-pink-500" />} {viewMode === 'WEAKNESS' ? 'Fixing Weaknesses' : 'Scrapbook'}</h2>{viewMode === 'WEAKNESS' ? (<QuizCard data={mistakes[reviewIndex]} onNext={handleReviewAnswer} />) : (renderFavoriteItem(favorites[reviewIndex]))}<div className="flex items-center gap-6 mt-8"><button onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))} disabled={reviewIndex === 0} className="text-white/50 hover:text-white disabled:opacity-20">Previous</button><p className="text-white/30 font-mono">{reviewIndex + 1} / {viewMode === 'WEAKNESS' ? mistakes.length : favorites.length}</p><button onClick={() => setReviewIndex(Math.min((viewMode === 'WEAKNESS' ? mistakes.length : favorites.length) - 1, reviewIndex + 1))} disabled={reviewIndex === (viewMode === 'WEAKNESS' ? mistakes.length : favorites.length) - 1} className="text-white/50 hover:text-white disabled:opacity-20">Next</button></div>{viewMode === 'SCRAPBOOK' && (<button onClick={() => { toggleFavorite(favorites[reviewIndex]); if (favorites.length <= 1) setViewMode(null); else if (reviewIndex >= favorites.length - 1) setReviewIndex(prev => prev - 1); }} className="mt-6 text-red-400 text-sm hover:text-red-300 flex items-center gap-2"><Trash2 size={14} /> Remove Item</button>)}</div></div>)}
    </div>
  );
};

export default Dashboard;