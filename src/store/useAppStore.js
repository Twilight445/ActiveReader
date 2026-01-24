import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { set as setDb, get as getDb, del as delDb } from 'idb-keyval';
// CHANGE THIS IMPORT:
import { upload } from "@vercel/blob/client"; // Use /client
// import { list } from "@vercel/blob"; // We can keep list, but it might also block on client.

const useAppStore = create(
  persist(
    (set, get) => ({
      // ... (Stats & UI State remain the same) ...
      xp: 0, level: 1, streak: 1, lastActiveDate: new Date().toISOString(), darkMode: false,
      currentScreen: 'DASHBOARD',
      activeBook: null,
      library: [],

      // --- GALLERY SLICE ---
      gallery: [],
      addToGallery: (item) => set((state) => ({ gallery: [item, ...state.gallery] })),
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

      // --- 1. LOCAL UPLOAD (Offline) ---
      addBookToLibrary: async (file) => {
        const bookId = Date.now();
        try {
          await setDb(`pdf_${bookId}`, file);
          const newBook = { id: bookId, title: file.name, type: 'LOCAL', progress: 1, totalPages: 0, lastRead: new Date().toISOString() };
          set((state) => ({ library: [newBook, ...state.library], activeBook: { ...newBook, fileData: file }, currentScreen: 'READER' }));
        } catch (error) { alert("Local storage full."); }
      },

      // --- 2. CLOUD UPLOAD (Secure) ---
      uploadToCloud: async (file) => {
        set({ isUploading: true });
        try {
          // This calls your new /api/upload route automatically
          const newBlob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/upload', // Point to the gatekeeper
          });

          const newBook = {
            id: Date.now(),
            title: file.name,
            type: 'CLOUD',
            url: newBlob.url, // URL from Vercel
            progress: 1,
            totalPages: 0,
            lastRead: new Date().toISOString()
          };

          set((state) => ({
            library: [newBook, ...state.library],
            activeBook: newBook,
            currentScreen: 'READER',
            isUploading: false
          }));

        } catch (error) {
          console.error("Cloud Upload Failed:", error);
          // Helpful error message for localhost users
          alert("Upload failed. \n\nNOTE: Cloud upload requires the app to be DEPLOYED on Vercel, or running via 'vercel dev'. It usually fails on standard 'npm run dev'.");
          set({ isUploading: false });
        }
      },

      // --- 3. SYNC WITH CLOUD (The Fix!) ---
      syncCloudLibrary: async () => {
        set({ isSyncing: true });
        try {
          // 1. Ask Vercel: "Give me a list of all files"
          const { blobs } = await list({
            token: import.meta.env.VITE_BLOB_READ_WRITE_TOKEN
          });

          // 2. Compare with current library
          const currentLib = get().library;
          const newCloudBooks = [];

          blobs.forEach((blob) => {
            // If this file is NOT in our library yet...
            const exists = currentLib.find(b => b.url === blob.url);

            if (!exists) {
              newCloudBooks.push({
                id: Date.now() + Math.random(), // Unique ID
                title: blob.pathname, // File name
                type: 'CLOUD',
                url: blob.url,
                progress: 1,
                totalPages: 0,
                lastRead: blob.uploadedAt // Use upload time
              });
            }
          });

          // 3. Update Library if we found new books
          if (newCloudBooks.length > 0) {
            set((state) => ({
              library: [...newCloudBooks, ...state.library],
              isSyncing: false
            }));
            alert(`Synced! Found ${newCloudBooks.length} new books.`);
          } else {
            set({ isSyncing: false });
            alert("Cloud is up to date.");
          }

        } catch (error) {
          console.error("Sync Error:", error);
          alert("Could not sync. Check internet.");
          set({ isSyncing: false });
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
            else { alert("Local file missing."); set({ currentScreen: 'DASHBOARD' }); }
          }
        }
      },

      deleteBook: async (bookId) => {
        const state = get();
        const book = state.library.find(b => b.id === bookId);
        if (book && book.type === 'LOCAL') await delDb(`pdf_${bookId}`);

        // Note: We don't delete from cloud here to prevent accidental data loss across devices
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

      updateBookStructure: (structure) => set((state) => {
        if (!state.activeBook) return {};
        const updatedBook = { ...state.activeBook, structure };
        const updatedLibrary = state.library.map((b) => b.id === updatedBook.id ? updatedBook : b);
        return { activeBook: updatedBook, library: updatedLibrary };
      }),
      // ... keep addMistake, resolveMistake, etc. exactly as they were ...
      addMistake: (q) => set(s => ({ mistakes: [...s.mistakes, q] })),
      resolveMistake: (q) => set(s => ({ mistakes: s.mistakes.filter(m => m.question !== q) })),
      toggleFavorite: (i) => set(s => {
        const id = i.question || i.title || i.mermaid_code;
        const exists = s.favorites.find(f => (f.question || f.title || f.mermaid_code) === id);
        return exists ? { favorites: s.favorites.filter(f => (f.question || f.title || f.mermaid_code) !== id) } : { favorites: [...s.favorites, i] };
      }),
      addHighlight: (text, color, page, bookId, rect) => set((state) => ({ highlights: [...state.highlights, { id: Date.now(), bookId, text, color, page, rect, date: new Date().toISOString() }] })),
      deleteHighlight: (id) => set((state) => ({ highlights: state.highlights.filter(h => h.id !== id) })),
      addUserSummary: (summary, page, bookId) => set((state) => ({ userSummaries: [...state.userSummaries, { id: Date.now(), bookId, summary, page, date: new Date().toISOString() }] })),
      deleteUserSummary: (id) => set((state) => ({ userSummaries: state.userSummaries.filter(s => s.id !== id) })),
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