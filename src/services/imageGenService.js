import useSettingsStore from '../store/useSettingsStore';

// Helper: Generates a nice colored placeholder with text
const getFallbackUrl = (text) => {
  const shortText = encodeURIComponent(text.substring(0, 20) + "...");
  return `https://placehold.co/800x600/indigo/white?text=${shortText}`;
};

// --- FREEPIK IMPLEMENTATION ---
const generateFreepikImage = async (prompt) => {
  const { freepikApiKey } = useSettingsStore.getState();
  // Prefer store key, fall back to Env
  const apiKey = freepikApiKey || import.meta.env.VITE_FREEPIK_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ Freepik API Key missing.");
    return null;
  }

  // Use local proxy defined in vite.config.js to bypass CORS
  // Target: https://api.freepik.com/v1/ai/text-to-image
  console.log(`🎨 Freepik: Requesting image (Classic Fast) via Proxy...`);

  try {
    const response = await fetch("/freepik-api/ai/text-to-image", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-freepik-api-key": apiKey
      },
      body: JSON.stringify({
        prompt: prompt,
        // The "Classic Fast" endpoint does NOT accept a 'model' parameter.
        // It uses the endpoint to determine the engine.
        image: { size: "square_1_1" }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Freepik API Error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const imageBase64 = data.data?.[0]?.base64;

    if (imageBase64) {
      return `data:image/png;base64,${imageBase64}`;
    }

    throw new Error("No image data returned from Freepik");

  } catch (error) {
    console.error("❌ Freepik Failed:", error);
    return null;
  }
};

// --- MAIN EXPORT ---
export const generateImageBackground = async (prompt) => {
  const { imageGenProvider } = useSettingsStore.getState();

  console.log(`🎨 Generating Image via [${imageGenProvider}] for:`, prompt);

  if (imageGenProvider === 'NONE') return getFallbackUrl(prompt);

  // Default / Priority: FREEPIK
  if (imageGenProvider === 'FREEPIK' || !imageGenProvider || imageGenProvider === 'SUBNP') {
    const result = await generateFreepikImage(prompt);
    if (result) return result;
    console.warn("⚠️ Freepik failed, returning fallback.");
    return getFallbackUrl(prompt);
  }

  return getFallbackUrl(prompt);
};