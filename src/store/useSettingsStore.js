import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
    persist(
        (set) => ({
            // API Keys (defaulting to .env values initially if needed, but easier to keep empty or load once)
            geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
            ocrSpaceApiKey: import.meta.env.VITE_OCR_SPACE_API_KEY || '',
            freepikApiKey: import.meta.env.VITE_FREEPIK_API_KEY || '',

            // Image Generation Config
            imageGenProvider: 'FREEPIK', // 'FREEPIK' or 'NONE'

            // Offline & Context Strategy
            scannedContextLimit: 3,
            textContextLimit: 5,
            chapterContextLimit: 15,
            manualChapterMode: false,
            enablePeriodicCheckpoints: true,

            // Feature Toggles
            enableAiFeatures: true,
            enablePdfScanning: true,

            // Actions
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            setOcrSpaceApiKey: (key) => set({ ocrSpaceApiKey: key }),
            setFreepikApiKey: (key) => set({ freepikApiKey: key }),
            setImageGenProvider: (provider) => set({ imageGenProvider: provider }),

            // Context Actions
            setScannedContextLimit: (n) => set({ scannedContextLimit: n }),
            setTextContextLimit: (n) => set({ textContextLimit: n }),
            setChapterContextLimit: (n) => set({ chapterContextLimit: n }),
            toggleManualChapterMode: () => set((s) => ({ manualChapterMode: !s.manualChapterMode })),
            togglePeriodicCheckpoints: () => set((s) => ({ enablePeriodicCheckpoints: !s.enablePeriodicCheckpoints })),

            toggleAiFeatures: () => set((state) => ({ enableAiFeatures: !state.enableAiFeatures })),
            togglePdfScanning: () => set((state) => ({ enablePdfScanning: !state.enablePdfScanning })),
            resetDefaults: () => set({
                geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
                ocrSpaceApiKey: import.meta.env.VITE_OCR_SPACE_API_KEY || '',
                freepikApiKey: import.meta.env.VITE_FREEPIK_API_KEY || '',
                imageGenProvider: 'FREEPIK',

                scannedContextLimit: 3,
                textContextLimit: 5,
                chapterContextLimit: 15,
                manualChapterMode: false,

                enableAiFeatures: true,
                enablePdfScanning: true
            })
        }),
        {
            name: 'socsci-settings-storage', // unique name for localStorage
        }
    )
);

export default useSettingsStore;
