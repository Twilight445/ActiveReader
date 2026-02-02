import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
    persist(
        (set) => ({
            // Cloud Sync
            syncId: '',

            // API Keys (defaulting to .env values initially if needed, but easier to keep empty or load once)
            geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
            pawanApiKey: import.meta.env.VITE_PAWAN_API_KEY || '',
            ocrSpaceApiKey: import.meta.env.VITE_OCR_SPACE_API_KEY || '',
            freepikApiKey: import.meta.env.VITE_FREEPIK_API_KEY || '',

            // AI Provider Configuration
            preferredAiProvider: 'GEMINI', // 'GEMINI', 'COSMOSRP_2_5', 'COSMOSRP_2_1', 'GPT_OSS'
            enableAutoFallback: true, // Enable automatic fallback to Pawan models
            visionProvider: 'AUTO', // 'AUTO', 'GEMINI', 'COSMOSRP' - for scanned PDFs

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
            enableTimeline: true,
            readerDarkMode: false,

            // Zen Reader Settings
            zenMode: true, // Default to Zen mode ON
            readerTheme: 'paper', // 'paper' | 'dark' | 'sepia' | 'night'
            readerFont: 'Literata', // 'Literata' | 'Georgia' | 'OpenDyslexic' | 'System'
            fontSize: 18,
            lineHeight: 1.8,
            marginSize: 'medium', // 'narrow' | 'medium' | 'wide'
            continuousScroll: false,
            dyslexiaFont: false,
            activeRecallMode: false, // New: Active Recall Mode

            // Actions
            setSyncId: (id) => set({ syncId: id }),
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            setPawanApiKey: (key) => set({ pawanApiKey: key }),
            setOcrSpaceApiKey: (key) => set({ ocrSpaceApiKey: key }),
            setFreepikApiKey: (key) => set({ freepikApiKey: key }),
            setImageGenProvider: (provider) => set({ imageGenProvider: provider }),

            // AI Provider Actions
            setPreferredAiProvider: (provider) => set({ preferredAiProvider: provider }),
            toggleAutoFallback: () => set((state) => ({ enableAutoFallback: !state.enableAutoFallback })),
            setVisionProvider: (provider) => set({ visionProvider: provider }),

            // Context Actions
            setScannedContextLimit: (n) => set({ scannedContextLimit: n }),
            setTextContextLimit: (n) => set({ textContextLimit: n }),
            setChapterContextLimit: (n) => set({ chapterContextLimit: n }),
            toggleManualChapterMode: () => set((s) => ({ manualChapterMode: !s.manualChapterMode })),
            togglePeriodicCheckpoints: () => set((s) => ({ enablePeriodicCheckpoints: !s.enablePeriodicCheckpoints })),

            toggleAiFeatures: () => set((state) => ({ enableAiFeatures: !state.enableAiFeatures })),
            togglePdfScanning: () => set((state) => ({ enablePdfScanning: !state.enablePdfScanning })),
            toggleTimeline: () => set((state) => ({ enableTimeline: !state.enableTimeline })),
            toggleReaderDarkMode: () => set((state) => ({ readerDarkMode: !state.readerDarkMode })),

            // Zen Reader Actions
            toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
            setReaderTheme: (theme) => set({ readerTheme: theme }),
            setReaderFont: (font) => set({ readerFont: font }),
            setFontSize: (size) => set({ fontSize: size }),
            setLineHeight: (height) => set({ lineHeight: height }),
            setMarginSize: (size) => set({ marginSize: size }),
            toggleContinuousScroll: () => set((state) => ({ continuousScroll: !state.continuousScroll })),
            toggleDyslexiaFont: () => set((state) => ({ dyslexiaFont: !state.dyslexiaFont })),
            toggleActiveRecallMode: () => set((state) => ({ activeRecallMode: !state.activeRecallMode })),

            resetDefaults: () => set({
                // Reset Keys? No, keep keys usually. But this resets EVERYTHING.
                // Keeping keys empty as per original logic.
                geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
                pawanApiKey: import.meta.env.VITE_PAWAN_API_KEY || '',
                ocrSpaceApiKey: import.meta.env.VITE_OCR_SPACE_API_KEY || '',
                freepikApiKey: import.meta.env.VITE_FREEPIK_API_KEY || '',
                imageGenProvider: 'FREEPIK',

                preferredAiProvider: 'GEMINI',
                enableAutoFallback: true,
                visionProvider: 'AUTO',

                scannedContextLimit: 3,
                textContextLimit: 5,
                chapterContextLimit: 15,
                manualChapterMode: false,

                enableAiFeatures: true,
                enablePdfScanning: true,
                enableTimeline: true,
                readerDarkMode: false,

                // Zen Defaults
                zenMode: true,
                readerTheme: 'paper',
                readerFont: 'Literata',
                fontSize: 18,
                lineHeight: 1.8,
                marginSize: 'medium',
                continuousScroll: false,
                dyslexiaFont: false,
                activeRecallMode: false
            })
        }),
        {
            name: 'socsci-settings-storage', // unique name for localStorage
        }
    )
);

export default useSettingsStore;
