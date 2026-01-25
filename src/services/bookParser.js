import { extractTextFromRange, isScannedPdf, getPageAsImage } from './pdfHelper';
import { ocrTextFromImage } from './ocrService';
import useSettingsStore from '../store/useSettingsStore';

/**
 * Orchestrates parsing of a PDF to extract text for AI.
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

            // Use scannedContextLimit from settings
            const { scannedContextLimit } = useSettingsStore.getState();
            const contextLimit = scannedContextLimit || 3; // Default to 3 if not set

            const images = [];
            // Capture pages based on settings
            const visionEnd = endPage;
            const visionStart = Math.max(startPage, endPage - contextLimit + 1);

            console.log(`📸 Capturing ${contextLimit} pages (${visionStart} to ${visionEnd}) as images...`);

            for (let i = visionStart; i <= visionEnd; i++) {
                try {
                    const base64Image = await getPageAsImage(fileBlob, i);
                    if (base64Image) {
                        images.push(base64Image);
                        console.log(`✅ Captured page ${i}`);
                    }
                } catch (imgError) {
                    console.warn(`⚠️ Failed to capture page ${i}:`, imgError.message);
                }
            }

            if (images.length === 0) {
                console.error("❌ No images could be captured for vision mode");
                return { mode: 'ERROR', data: null };
            }

            console.log(`✅ Captured ${images.length} images for vision mode`);
            return { mode: 'VISION', data: images };
        }

        // --- SCENARIO B: TEXT PDF (TEXT MODE) ---
        return { mode: 'TEXT', data: text };

    } catch (error) {
        console.error("❌ PDF Parsing failed:", error);
        return { mode: 'ERROR', data: null };
    }
};
