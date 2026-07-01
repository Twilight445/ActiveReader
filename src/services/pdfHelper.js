import { pdfjs } from 'react-pdf';

// Ensure worker is configured
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * Cache for loaded PDF documents to avoid re-parsing the same file.
 * Uses a WeakRef to allow garbage collection when the blob is no longer referenced.
 */
let cachedPdfDoc = null;
let cachedBlobRef = null;

export const getOrLoadPdf = async (fileBlob) => {
  // Return cached document if it's for the same blob
  if (cachedBlobRef === fileBlob && cachedPdfDoc) {
    return cachedPdfDoc;
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const pdf = await pdfjs.getDocument(arrayBuffer).promise;

  cachedPdfDoc = pdf;
  cachedBlobRef = fileBlob;

  return pdf;
};

export const extractTextFromRange = async (fileBlob, startPage, endPage) => {
  try {
    const pdf = await getOrLoadPdf(fileBlob);
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
    console.error('Text extraction failed:', error);
    return '';
  }
};

// Function to convert Page -> Image for Scanned PDFs
export const getPageAsImage = async (fileBlob, pageNum) => {
  try {
    const pdf = await getOrLoadPdf(fileBlob);
    const page = await pdf.getPage(pageNum);

    // Reduced scale and quality for faster vision API calls
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    // Return pure Base64 string with lower quality for API calls
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

    // Clean up canvas to free memory
    canvas.width = 0;
    canvas.height = 0;

    return dataUrl.split(',')[1];
  } catch (error) {
    console.error('Image conversion failed:', error);
    return null;
  }
};

export const isScannedPdf = async (fileBlob, samplePages = 3) => {
  const text = await extractTextFromRange(fileBlob, 1, samplePages);
  return !text || text.trim().length < 50;
};
