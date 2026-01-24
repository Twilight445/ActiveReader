import React, { useState } from 'react';
import { X, FileText, Highlighter, BrainCircuit, Trash2, ChevronRight, BookOpen, Image as ImageIcon, Loader2 } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import QuizCard from '../activities/QuizCard';
import ConceptMap from '../activities/ConceptMap';
import NanoFlashcard from '../activities/NanoFlashcard';

const BookNotebook = ({ book, onClose }) => {
    const { highlights, userSummaries, favorites, gallery, deleteHighlight, deleteUserSummary, toggleFavorite, deleteFromGallery } = useAppStore();
    const [activeTab, setActiveTab] = useState('summary');

    // filter data for this book
    // Ensure we compare strings to avoid type mismatches
    const bookId = book.id.toString();

    const bookSummaries = userSummaries.filter(s => s.bookId?.toString() === bookId);
    const bookHighlights = highlights.filter(h => h.bookId?.toString() === bookId);
    const bookGallery = gallery.filter(g => g.bookId?.toString() === bookId);

    // Activities (Favorites) are tricky as they might not have bookId if created before the update
    // But moving forward they will. For now show all that match.
    const bookActivities = favorites.filter(f => f.bookId?.toString() === bookId);

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <BookOpen size={24} />
                        <div>
                            <h2 className="text-xl font-bold">{book.title}</h2>
                            <p className="text-xs text-indigo-200">Notebook & Activities</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition"><X size={20} /></button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-gray-200 bg-gray-50 flex-wrap">
                    <button onClick={() => setActiveTab('summary')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'summary' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <FileText size={16} /> Summaries ({bookSummaries.length})
                    </button>
                    <button onClick={() => setActiveTab('highlights')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'highlights' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <Highlighter size={16} /> Highlights ({bookHighlights.length})
                    </button>
                    <button onClick={() => setActiveTab('activities')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'activities' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <BrainCircuit size={16} /> Activities ({bookActivities.length})
                    </button>
                    <button onClick={() => setActiveTab('gallery')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'gallery' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <ImageIcon size={16} /> Gallery ({bookGallery.length})
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">

                    {/* SUMMARIES TAB */}
                    {activeTab === 'summary' && (
                        <div className="space-y-4">
                            {bookSummaries.length === 0 ? <EmptyState msg="No summaries yet. Read the book and take notes!" /> :
                                bookSummaries.map(item => (
                                    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        <p className="text-gray-800 whitespace-pre-wrap">{item.summary}</p>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Page {item.page}</span>
                                            <span className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</span>
                                            <button onClick={() => deleteUserSummary(item.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {/* HIGHLIGHTS TAB */}
                    {activeTab === 'highlights' && (
                        <div className="space-y-4">
                            {bookHighlights.length === 0 ? <EmptyState msg="No highlights yet." /> :
                                bookHighlights.map(item => (
                                    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm" style={{ borderLeft: `4px solid ${item.color}` }}>
                                        <p className="text-gray-800 font-serif italic text-lg leading-relaxed">"{item.text}"</p>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                            <span className="text-xs font-bold text-gray-500">Page {item.page}</span>
                                            <button onClick={() => deleteHighlight(item.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {/* ACTIVITIES TAB */}
                    {activeTab === 'activities' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bookActivities.length === 0 ? <div className="col-span-full"><EmptyState msg="No saved quizzes or maps. Click 'Favorite' on generated content." /></div> :
                                bookActivities.map(item => (
                                    <div key={item.id || item.question} className="relative group">
                                        <div className="scale-[0.85] origin-top-left pointer-events-none">
                                            {item.type === 'concept_map' ? <ConceptMap data={item} /> :
                                                item.type === 'visual' ? <NanoFlashcard data={item} /> :
                                                    <QuizCard data={item} />
                                            }
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <button onClick={() => toggleFavorite(item)} className="bg-white p-2 rounded-full shadow text-red-500 hover:bg-red-50">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {/* GALLERY TAB */}
                    {activeTab === 'gallery' && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {bookGallery.length === 0 ? <div className="col-span-full"><EmptyState msg="No images generated for this book." /></div> :
                                bookGallery.map(img => (
                                    <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100 border border-gray-200 shadow-sm">
                                        {img.status === 'success' ? (
                                            <img src={img.url} className="w-full h-full object-cover transition transform group-hover:scale-110" alt={img.prompt} />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Loader2 className="animate-spin" size={24} /></div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                            <a href={img.url} target="_blank" rel="noreferrer" className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white"><ImageIcon size={16} /></a>
                                            <button onClick={() => deleteFromGallery(img.id)} className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-[10px] text-white truncate">
                                            {img.prompt}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ msg }) => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="bg-gray-100 p-4 rounded-full mb-3">
            <BookOpen size={32} />
        </div>
        <p>{msg}</p>
    </div>
);

export default BookNotebook;
