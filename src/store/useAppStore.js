import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { set as setDb, get as getDb, del as delDb } from 'idb-keyval';
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, arrayUnion, serverTimestamp } from 'firebase/firestore';
import useSettingsStore from './useSettingsStore';

const useAppStore = create(
  persist(
    (set, get) => ({
      // State
      xp: 0,
      level: 1,
      streak: 1,
      lastActiveDate: new Date().toISOString(),
      darkMode: false,
      currentScreen: 'DASHBOARD',
      activeBook: null,
      library: [],

      // Arrays - EXPLICITLY INITIALIZED
      mistakes: [],
      favorites: [],
      highlights: [],
      userSummaries: [],
      userSummaries: [],
      bookmarks: [], // [{ bookId, page, timestamp }]
      gallery: [],
      addToGallery: (item) => set((state) => ({
        gallery: [{ ...item, bookId: item.bookId || state.activeBook?.id?.toString() }, ...state.gallery]
      })),
      toggleBookmark: (bookId, page) => set((state) => {
        const exists = state.bookmarks.find(b => b.bookId === bookId && b.page === page);
        if (exists) {
          return { bookmarks: state.bookmarks.filter(b => b.bookId !== bookId || b.page !== page) };
        } else {
          return { bookmarks: [...state.bookmarks, { bookId, page, timestamp: Date.now() }] };
        }
      }),
      updateGalleryImage: (id, url, status = 'success') => set((state) => ({
        gallery: state.gallery.map(img => img.id === id ? { ...img, url, status } : img)
      })),
      deleteFromGallery: (id) => set((state) => ({
        gallery: state.gallery.filter(img => img.id !== id)
      })),

      // Loading states
      isUploading: false,
      isSyncing: false, // <--- New State

      // ... (Keep Actions: setScreen, toggleActivity, etc.) ...
      setScreen: (screen) => set({ currentScreen: screen }),
      toggleActivity: (isOpen) => set({ isActivityOpen: isOpen }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      // ... (Keep addXP) ...
      addXP: (amount) => {
        set((state) => {
          const newXP = state.xp + amount;
          const newLevel = Math.floor(newXP / 100) + 1;
          return { xp: newXP, level: newLevel };
        });
        get().saveUserDataToCloud();
      },

      addMistake: (q) => {
        const bookId = get().activeBook?.id?.toString();
        set(s => ({ mistakes: [...s.mistakes, { ...q, bookId: q.bookId || bookId }] }));
        get().saveUserDataToCloud();
      },
      resolveMistake: (q) => { set(s => ({ mistakes: s.mistakes.filter(m => m.question !== q) })); get().saveUserDataToCloud(); },
      toggleFavorite: (i) => {
        set(s => {
          const id = i.question || i.title || i.mermaid_code;
          const exists = s.favorites.find(f => (f.question || f.title || f.mermaid_code) === id);
          if (exists) {
            return { favorites: s.favorites.filter(f => (f.question || f.title || f.mermaid_code) !== id) };
          } else {
            const bookId = get().activeBook?.id?.toString();
            return { favorites: [...s.favorites, { ...i, bookId: i.bookId || bookId }] };
          }
        });
        get().saveUserDataToCloud();
      },

      addMultipleFavorites: (items) => {
        const bookId = get().activeBook?.id?.toString();
        set(state => {
          const newFavs = [...state.favorites];
          items.forEach(item => {
            const id = item.question || item.title || item.mermaid_code;
            if (!newFavs.some(f => (f.question || f.title || f.mermaid_code) === id)) {
              newFavs.push({ ...item, bookId: item.bookId || bookId });
            }
          });
          return { favorites: newFavs };
        });
        get().saveUserDataToCloud();
      },

      // --- 1. LOCAL UPLOAD (Offline) ---
      addBookToLibrary: async (file) => {
        const bookId = Date.now();
        try {
          await setDb(`pdf_${bookId}`, file);
          const newBook = { id: bookId, title: file.name, type: 'LOCAL', progress: 1, totalPages: 0, lastRead: new Date().toISOString() };
          set((state) => ({ library: [newBook, ...state.library], activeBook: { ...newBook, fileData: file }, currentScreen: 'READER' }));

          // Sync with Cloud
          const syncId = useSettingsStore.getState().syncId;
          if (syncId) {
            get().saveUserDataToCloud(bookId.toString());
          }
        } catch (error) { alert("Local storage full."); }
      },

      // --- 2. CLOUD REGISTRATION (Metadata Only) ---
      uploadToCloud: async (file) => {
        const syncId = useSettingsStore.getState().syncId;
        if (!syncId) { alert("Please set a Cloud Sync Key in Settings first."); return; }

        set({ isUploading: true });
        try {
          // 1. Save File Locally (since we can't use Cloud Storage)
          const bookId = Date.now().toString();
          await setDb(`pdf_${bookId}`, file);

          // 2. Create Book Object
          const newBook = {
            id: bookId,
            title: file.name,
            type: 'LOCAL', // Treat as local so we look in IDB
            url: null,     // No cloud URL
            progress: 1,
            totalPages: 0,
            lastRead: new Date().toISOString()
          };

          // 3. Save Metadata to Firestore
          await setDoc(doc(db, "sync_users", syncId, "books", newBook.id), newBook);

          // 4. Update Local State
          set((state) => ({
            library: [newBook, ...state.library],
            activeBook: { ...newBook, fileData: file },
            currentScreen: 'READER',
            isUploading: false
          }));

          alert("Book registered! Metadata synced.\n\nNote: Since Cloud Storage is off, you must manually add this PDF on other devices if missing.");

        } catch (error) {
          console.error("Cloud Reg Failed:", error);
          alert("Registration failed: " + error.message);
          set({ isUploading: false });
        }
      },

      // --- 3. SYNC LOGIC (Firestore) ---
      syncCloudLibrary: async () => {
        const state = get();
        const syncId = useSettingsStore.getState().syncId;
        if (!syncId) { alert("No Sync Key set."); return; }

        set({ isSyncing: true });
        try {
          // 1. Sync User Stats
          await get().saveUserDataToCloud();

          // 2. Sync ALL Books
          const books = state.library;
          console.log(`🔄 Syncing ${books.length} books...`);

          for (const book of books) {
            await get().saveUserDataToCloud(book.id.toString());
          }

          setTimeout(() => {
            set({ isSyncing: false });
            alert(`Full Sync Completed! (${books.length} books scanned)`);
          }, 800);
        } catch (e) {
          console.error(e);
          set({ isSyncing: false });
          alert("Sync Failed: " + e.message);
        }
      },

      initializeSync: (syncId) => {
        if (!syncId) return () => { };

        // Listener for Books
        const unsubBooks = onSnapshot(collection(db, "sync_users", syncId, "books"), (snapshot) => {
          const cloudBooks = [];
          snapshot.forEach(doc => cloudBooks.push({ ...doc.data(), id: doc.id }));

          if (cloudBooks.length === 0) return;

          set(state => {
            const newLib = [...state.library];
            let incomingHighlights = [];
            let incomingSummaries = [];
            let incomingFavorites = [];
            let incomingGallery = [];

            cloudBooks.forEach(cBook => {
              const cId = cBook.id.toString();
              // Extract arrays (gallery excluded to prevent size limit errors)
              if (cBook.highlights) incomingHighlights.push(...cBook.highlights);
              if (cBook.summaries) incomingSummaries.push(...cBook.summaries);
              if (cBook.questions) incomingFavorites.push(...cBook.questions);

              // Find strict match by ID or fuzzy match by Title
              const existingIdx = newLib.findIndex(b => b.id.toString() === cId || b.title === cBook.title);

              if (existingIdx >= 0) {
                const existing = newLib[existingIdx];
                newLib[existingIdx] = { ...existing, ...cBook, fileData: existing.fileData };
              } else {
                newLib.push(cBook);
              }
            });

            // Merge & Dedupe function (Simple ID check)
            const mergedHighlights = [...state.highlights, ...incomingHighlights].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
            const mergedSummaries = [...state.userSummaries, ...incomingSummaries].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
            const mergedFavorites = [...state.favorites, ...incomingFavorites].filter((v, i, a) => a.findIndex(t => ((t.id || t.question) === (v.id || v.question))) === i);

            // Final Book Deduplication
            const uniqueLib = [];
            const seenIds = new Set();
            for (const b of newLib) {
              const sid = b.id.toString();
              if (!seenIds.has(sid)) {
                uniqueLib.push(b);
                seenIds.add(sid);
              }
            }

            return {
              library: uniqueLib,
              highlights: mergedHighlights,
              userSummaries: mergedSummaries,
              favorites: mergedFavorites
              // gallery remains local-only to prevent size issues
            };
          });
        });

        // Listener for User Stats
        const unsubStats = onSnapshot(doc(db, "sync_users", syncId), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            set(state => {
              if (data.xp > state.xp) return { xp: data.xp, level: data.level, streak: data.streak };
              return {};
            });
          }
        });

        return () => {
          console.log("Cleaning up Sync Listeners");
          unsubBooks();
          unsubStats();
        };
      },

      saveUserDataToCloud: async (targetBookId) => {
        const state = get();
        const syncId = useSettingsStore.getState().syncId;
        if (!syncId) return;

        try {
          // Save Stats
          await setDoc(doc(db, "sync_users", syncId), {
            xp: state.xp,
            level: state.level,
            streak: state.streak,
            lastActive: new Date().toISOString()
          }, { merge: true });

          // Save Book Data
          const bookId = targetBookId || (state.activeBook ? state.activeBook.id.toString() : null);
          if (bookId) {
            const bookMeta = state.library.find(b => b.id.toString() === bookId);
            if (!bookMeta) return;

            const { fileData, ...cleanBook } = bookMeta;

            // Prepare data for sync (excluding gallery to prevent size limit)
            const bookData = {
              ...cleanBook,
              lastRead: new Date().toISOString(),
              highlights: state.highlights.filter(h => h.bookId?.toString() === bookId),
              summaries: state.userSummaries.filter(s => s.bookId?.toString() === bookId),
              questions: state.favorites.filter(f => f.bookId?.toString() === bookId)
              // Gallery excluded - images cause document size to exceed 1MB limit
            };

            // Calculate estimated size to warn user
            const estimatedSize = JSON.stringify(bookData).length;
            if (estimatedSize > 900000) { // 900KB warning threshold
              console.warn(`⚠️ Book data approaching size limit: ${(estimatedSize / 1024).toFixed(0)}KB`);
            }

            await setDoc(doc(db, "sync_users", syncId, "books", bookId), bookData, { merge: true });
            console.log(`✅ Cloud Sync Success for Book: ${bookId} (${(estimatedSize / 1024).toFixed(0)}KB)`);
          }
        } catch (e) {
          // Enhanced error handling for size limit
          if (e.message && e.message.includes('exceeds the maximum allowed size')) {
            console.error("❌ Cloud Sync Error: Document too large. Try removing some favorites or highlights.");
            // Don't throw - fail silently to not break user experience
          } else {
            console.error("❌ Cloud Sync Error:", e);
          }
        }
      },

      // --- OPEN BOOK ---
      openBook: async (bookId) => {
        const state = get();
        const book = state.library.find(b => b.id === bookId);

        if (book) {
          set({ currentScreen: 'READER', activeBook: { ...book, fileData: null } });
          if (book.type === 'CLOUD') {
            set({ activeBook: book });
          } else {
            const fileBlob = await getDb(`pdf_${bookId}`);
            if (fileBlob) set({ activeBook: { ...book, fileData: fileBlob } });
            else {
              // Local file missing strategy: Don't boot to dashboard.
              // Set flag so BookViewer can show recovery UI.
              set({ activeBook: { ...book, fileData: null, isMissingFile: true } });
            }
          }
        }
      },

      recoverLocalBook: async (file) => {
        const state = get();
        const bookId = state.activeBook?.id;
        if (!bookId) return;

        try {
          await setDb(`pdf_${bookId}`, file);
          set({ activeBook: { ...state.activeBook, fileData: file, isMissingFile: false } });
        } catch (e) {
          alert("Recovery failed: " + e.message);
        }
      },

      deleteBook: async (bookId) => {
        const state = get();
        const book = state.library.find(b => b.id === bookId);

        // 1. Delete Local File
        if (book && book.type === 'LOCAL') await delDb(`pdf_${bookId}`);

        // 2. Delete from Cloud (Firestore)
        const syncId = useSettingsStore.getState().syncId;
        if (syncId) {
          try {
            // Delete Book Metadata
            await deleteDoc(doc(db, "sync_users", syncId, "books", bookId.toString()));
            console.log(`🗑️ Deleted book ${bookId} from Cloud.`);
          } catch (e) {
            console.error("Failed to delete from cloud", e);
          }
        }

        // 3. Update State
        set((state) => ({
          library: state.library.filter(b => b.id !== bookId),
          activeBook: null
        }));
      },

      // ... (Keep mistakes, highlights, userSummaries, etc.) ...
      updateBookProgress: (page, total) => set((state) => {
        if (!state.activeBook) return {};
        const updatedBook = { ...state.activeBook, progress: page, totalPages: total || state.activeBook.totalPages };
        const updatedLibrary = state.library.map((b) => b.id === updatedBook.id ? updatedBook : b);
        return { activeBook: updatedBook, library: updatedLibrary };
      }),

      updateBookStructure: (structure) => {
        set((state) => {
          if (!state.activeBook) return {};
          const updatedBook = { ...state.activeBook, structure };
          const updatedLibrary = state.library.map((b) => b.id === updatedBook.id ? updatedBook : b);
          return { activeBook: updatedBook, library: updatedLibrary };
        });
        get().saveUserDataToCloud();
      },
      addHighlight: (text, color, page, bookId, rect) => { set((state) => ({ highlights: [...state.highlights, { id: Date.now(), bookId, text, color, page, rect, date: new Date().toISOString() }] })); get().saveUserDataToCloud(bookId); },
      deleteHighlight: (id) => {
        const bookId = get().activeBook?.id;
        set((state) => ({ highlights: state.highlights.filter(h => h.id !== id) }));
        if (bookId) get().saveUserDataToCloud(bookId);
      },
      addUserSummary: (summary, page, bookId) => { set((state) => ({ userSummaries: [...state.userSummaries, { id: Date.now(), bookId, summary, page, date: new Date().toISOString() }] })); get().saveUserDataToCloud(bookId); },
      deleteUserSummary: (id) => {
        const bookId = get().activeBook?.id;
        set((state) => ({ userSummaries: state.userSummaries.filter(s => s.id !== id) }));
        if (bookId) get().saveUserDataToCloud(bookId);
      },
    }),
    {
      name: 'socsci-storage',
      partialize: (state) => ({
        library: state.library, xp: state.xp, level: state.level, mistakes: state.mistakes, favorites: state.favorites, highlights: state.highlights, userSummaries: state.userSummaries
      }),
    }
  )
);

export default useAppStore;