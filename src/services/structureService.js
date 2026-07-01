import { extractTextFromRange, getOrLoadPdf } from './pdfHelper';
import { GoogleGenerativeAI } from "@google/generative-ai";
import useSettingsStore from '../store/useSettingsStore';
import { generateWithPawan } from './pawanService';

/**
 * Checks for Built-in PDF Outline (Bookmarks).
 * If found, returns { startPage, chapters: [{ title, page }] }
 */
export const getPdfOutline = async (fileBlob) => {
    try {
        const pdf = await getOrLoadPdf(fileBlob);
        const outline = await pdf.getOutline();

        if (!outline || outline.length === 0) return null;

        // Map outline to a flat chapter list
        // Note: Outline items usually have `dest`. parsing dest to page number is complex in pdf.js
        // We need to resolve `dest`. 

        const chapters = [];
        for (const item of outline) {
            try {
                // Determine Page Number from Dest
                let dest = item.dest;
                if (typeof dest === 'string') {
                    dest = await pdf.getDestination(dest);
                }

                if (dest && Array.isArray(dest)) {
                    const ref = dest[0]; // Object Ref
                    const pageIndex = await pdf.getPageIndex(ref);
                    chapters.push({ title: item.title, page: pageIndex + 1 });
                }
            } catch (e) {
                console.warn("Skipping outline item:", item.title, e);
            }
        }

        if (chapters.length > 0) {
            // Assume 1st Chapter is the Content Start
            return {
                startPage: chapters[0].page,
                chapters: chapters
            };
        }
        return null;

    } catch (error) {
        console.error('PDF Outline Check Failed:', error);
        return null;
    }
};

/**
 * Analyzes Index/TOC using AI (Fallback) with multi-provider support.
 * Extracts first 10 pages text -> AI -> JSON Structure.
 */
export const analyzeTextStructure = async (fileBlob) => {
    // 1. Check Outline first (Fastest/Most Reliable)
    const builtIn = await getPdfOutline(fileBlob);
    if (builtIn) return builtIn;


    // 2. Extract first 10 pages
    const text = await extractTextFromRange(fileBlob, 1, 10);
    if (!text || text.length < 100) return null; // Scanned or empty

    // 3. AI Analysis with fallback
    const { geminiApiKey, preferredAiProvider, enableAutoFallback } = useSettingsStore.getState();

    const prompt = `
    Analyze this book text (first 10 pages).
    Find the "Table of Contents" or identify where the actual chapters begin.
    Ignore Preface, Acknowledgements, Introduction, etc.
    Return JSON:
    {
        "startPage": number (The page number where Chapter 1 starts in the PDF, accounting for offset if possible),
        "chapters": [ {"title": "Chapter 1...", "page": number} ]
    }
    If unknown, return null.
    `;

    // Build provider chain (text-only, no vision needed)
    let providerChain = [];
    if (preferredAiProvider === 'GEMINI') {
        providerChain = enableAutoFallback ? ['GEMINI', 'COSMOSRP_2_5', 'GPT_OSS'] : ['GEMINI'];
    } else if (preferredAiProvider === 'COSMOSRP_2_5') {
        providerChain = enableAutoFallback ? ['COSMOSRP_2_5', 'GEMINI'] : ['COSMOSRP_2_5'];
    } else if (preferredAiProvider === 'COSMOSRP_2_1') {
        providerChain = enableAutoFallback ? ['COSMOSRP_2_1', 'GEMINI'] : ['COSMOSRP_2_1'];
    } else if (preferredAiProvider === 'GPT_OSS') {
        providerChain = enableAutoFallback ? ['GPT_OSS', 'GEMINI'] : ['GPT_OSS'];
    }

    // Try each provider
    for (const provider of providerChain) {
        try {
            let responseText;
            if (provider === 'GEMINI') {
                const key = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
                if (!key) {
                    console.warn("No Gemini API key available");
                    continue;
                }
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent([prompt, text]);
                const response = await result.response;
                responseText = response.text();
            } else {
                // Use Pawan models
                responseText = await generateWithPawan(
                    provider,
                    `${prompt}\n\n${text}`,
                    null,
                    provider.startsWith('COSMOSRP') // Use instructed for CosmosRP
                );
            }

            const json = JSON.parse(responseText.replace(/```json|```/g, '').trim());
            return json;

        } catch (e) {
            console.warn(`Structure analysis failed with ${provider}:`, e.message);
            // Continue to next provider
        }
    }

    console.error("All providers failed for structure analysis");
    return null;
};
