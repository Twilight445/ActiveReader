import { extractTextFromRange, isScannedPdf, getPageAsImage } from './pdfHelper';
import { ocrTextFromImage } from './ocrService';

/**
 * Orchestrates parsing of a PDF to extract text for Gemini.
 * Allows Smart switching between Text-Extraction and OCR.
 * 
 * @param {Blob} fileBlob - The PDF file blob.
 * @param {number} startPage - Start page (1-indexed).
 * @param {number} endPage - End page.
 * @returns {Promise<string>} - The extracted text.
 */
export const parsePdf = async (fileBlob, startPage, endPage) => {
    try {
        console.log(`📖 Parsing pages ${startPage}-${endPage}...`);

        let text = await extractTextFromRange(fileBlob, startPage, endPage);

        // Define a threshold for "valid text" per page. 
        // If 5 pages yield < 50 chars, it's likely scanned.
        const charThreshold = 50;

        // --- SCENARIO A: SCANNED PDF (VISION MODE) ---
        if (!text || text.trim().length < charThreshold) {
            console.warn("⚠️ Text extraction yielded low content. Likely scanned PDF. Switching to VISION Mode...");

            const images = [];
            // Capture last 3 pages (or available range) for Vision context
            const visionEnd = endPage;
            const visionStart = Math.max(1, endPage - 2);

            console.log(`📸 Capturing pages ${visionStart} to ${visionEnd} as images...`);

            for (let i = visionStart; i <= visionEnd; i++) {
                const base64Image = await getPageAsImage(fileBlob, i);
                if (base64Image) images.push(base64Image);
            }

            return { mode: 'VISION', data: images };
        }

        // --- SCENARIO B: TEXT PDF (TEXT MODE) ---
        return { mode: 'TEXT', data: text };

    } catch (error) {
        console.error("❌ PDF Parsing failed:", error);
        return { mode: 'ERROR', data: null };
    }
};
