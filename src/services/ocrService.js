import useSettingsStore from '../store/useSettingsStore';

export const ocrTextFromImage = async (base64Image) => {
  const { ocrSpaceApiKey } = useSettingsStore.getState();
  const apiKey = ocrSpaceApiKey || import.meta.env.VITE_OCR_SPACE_API_KEY;

  if (!apiKey) {
    console.warn("Missing VITE_OCR_SPACE_API_KEY");
    return null;
  }

  const formData = new FormData();
  formData.append("base64Image", `data:image/jpeg;base64,${base64Image}`);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("scale", "true"); // Auto-scale for better OCR
  formData.append("OCREngine", "2"); // Engine 2 is better for text in images

  try {
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        "apikey": apiKey,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      console.error("OCR API Error:", data.ErrorMessage);
      return null;
    }

    // Combine text from all parsed results
    const extractedText = data.ParsedResults
      ?.map(result => result.ParsedText)
      .join("\n")
      .trim();

    return extractedText || null;
  } catch (error) {
    console.error("OCR Request Failed:", error);
    return null;
  }
};
