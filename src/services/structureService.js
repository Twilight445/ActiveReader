import { pdfjs } from 'react-pdf';
import { extractTextFromRange } from './pdfHelper';
import { GoogleGenerativeAI } from "@google/generative-ai";
import useSettingsStore from '../store/useSettingsStore';

// Ensure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * Checks for Built-in PDF Outline (Bookmarks).
 * If found, returns { startPage, chapters: [{ title, page }] }
 */
export const getPdfOutline = async (fileBlob) => {
    try {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        const outline = await pdf.getOutline();

        if (!outline || outline.length === 0) return null;

        console.log("📑 Found Built-in PDF Outline:", outline);

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
        console.error("❌ PDF Outline Check Failed:", error);
        return null;
    }
};

/**
 * Analyzes Index/TOC using AI (Fallback).
 * Extracts first 10 pages text -> Gemini -> JSON Structure.
 */
export const analyzeTextStructure = async (fileBlob) => {
    // 1. Check Outline first (Fastest/Most Reliable)
    const builtIn = await getPdfOutline(fileBlob);
    if (builtIn) return builtIn;

    console.log("🔍 No outline found. Analyzing Text Structure with AI...");

    // 2. Extract first 10 pages
    const text = await extractTextFromRange(fileBlob, 1, 10);
    if (!text || text.length < 100) return null; // Scanned or empty

    // 3. AI Analysis
    const { geminiApiKey } = useSettingsStore.getState();
    const key = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) return null;

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    try {
        const result = await model.generateContent([prompt, text]);
        const responseText = await result.response.text();
        const json = JSON.parse(responseText.replace(/```json|```/g, '').trim());
        console.log("🤖 AI Structure Analysis:", json);
        return json;
    } catch (e) {
        console.error("AI Analysis Failed:", e);
        return null;
    }
};
