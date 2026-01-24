import { pdfjs } from 'react-pdf';

// Ensure worker is configured
// Ensure worker is configured
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const extractTextFromRange = async (fileBlob, startPage, endPage) => {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    let fullText = '';

    for (let i = startPage; i <= endPage; i++) {
      if (i > pdf.numPages) break;
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + ' ';
    }
    return fullText.trim();
  } catch (error) {
    console.error("Text extraction failed:", error);
    return '';
  }
};

// Function to convert Page -> Image for Scanned PDFs
export const getPageAsImage = async (fileBlob, pageNum) => {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(pageNum);

    const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for AI readability
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    // Return pure Base64 string (no data:image/jpeg prefix)
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  } catch (error) {
    console.error("Image conversion failed:", error);
    return null;
  }
};

export const isScannedPdf = async (fileBlob, samplePages = 3) => {
  const text = await extractTextFromRange(fileBlob, 1, samplePages);
  // If text length is suspiciously low for 3 pages, it's likely scanned.
  // Using 50 chars as a conservative threshold.
  return !text || text.trim().length < 50;
};
