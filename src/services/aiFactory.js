import { GoogleGenerativeAI } from "@google/generative-ai";
import useSettingsStore from '../store/useSettingsStore';
import { generateWithPawan } from './pawanService';

// --- CONFIGURATION ---
const getGenAI = () => {
  const { geminiApiKey } = useSettingsStore.getState();
  const key = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  return new GoogleGenerativeAI(key);
}

// --- PROMPTS ---
const JSON_INSTRUCTION = `
Return ONLY valid JSON. No markdown.
Structure:
{
  "quiz": [
    {
      "type": "mcq",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct Option String"
    }
  ],
  "timeline": [
    {
      "type": "timeline",
      "events": [
        {"id": "e1", "label": "Event A", "order": 1},
        {"id": "e2", "label": "Event B", "order": 2}
      ],
      "question": "Arrange correctly"
    }
  ],
  "concept_map": {
    "type": "concept_map",
    "title": "Main Topic",
    "mermaid_code": "graph TD; A[\"Node A\"] -->|Label| B(\"Node B\"); style A fill:#f9f,stroke:#333,stroke-width:2px; style B fill:#bbf,stroke:#333,stroke-width:2px; classDef default fill:#fff,stroke:#333,stroke-width:1px;"
  },
  "mermaid_tips": "CRITICAL: 1. Use 'graph TD'. 2. ALL node texts MUST be in double quotes (e.g. A[\"Text\"]). 3. NO special chars like () [] {} inside the quotes. 4. Keep it simple.",
  "summary_bullet_points": ["Point 1", "Point 2"],
  "short_summary": "A concise 2-3 sentence summary of the key concepts covered in this activity.",
  "visual_concept": "Description of a visual scene representing the key concept."
}
`;

// --- HELPER: Try a single provider ---
const tryProvider = async (provider, mode, data, type, promptPrefix) => {
  const textPrompt = `${promptPrefix} ${JSON_INSTRUCTION}`;

  if (provider === 'GEMINI') {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let result;
    if (mode === 'VISION') {
      const images = Array.isArray(data) ? data : [data];
      const imageParts = images.map(img => ({
        inlineData: { data: img, mimeType: "image/jpeg" }
      }));
      result = await model.generateContent([textPrompt, ...imageParts]);
    } else {
      result = await model.generateContent([textPrompt, data]);
    }

    const response = await result.response;
    return response.text();
  }
  else if (provider === 'COSMOSRP_2_5' || provider === 'COSMOSRP_2_1') {
    // Pawan CosmosRP models
    const images = (mode === 'VISION') ? (Array.isArray(data) ? data : [data]) : null;
    const textData = (mode === 'TEXT') ? data : "";

    // Shorter prompt for vision mode to reduce payload size
    const fullPrompt = (mode === 'TEXT')
      ? textPrompt
      : "Analyze these images and create study activities. Return ONLY valid JSON.";

    return await generateWithPawan(
      provider,
      mode === 'TEXT' ? `${fullPrompt}\n\n${textData}` : fullPrompt,
      images,
      true // Use instructed version for more natural responses
    );
  }
  else if (provider === 'GPT_OSS') {
    // GPT-OSS doesn't support vision
    if (mode === 'VISION') {
      throw new Error('GPT-OSS does not support vision mode');
    }
    return await generateWithPawan(provider, `${textPrompt}\n\n${data}`, null, false);
  }

  throw new Error(`Unknown provider: ${provider}`);
};

// --- MAIN FUNCTION ---
/**
 * Generates activities from PDF content with automatic provider fallback.
 * @param {object} parsedInput - { mode: 'TEXT'|'VISION', data: string|string[] }
 * @param {string} type - 'MICRO' or 'CHAPTER_END'.
 */
export const generateActivities = async (parsedInput, type = 'MICRO') => {

  const { enableAiFeatures, preferredAiProvider, enableAutoFallback, visionProvider } = useSettingsStore.getState();
  if (!enableAiFeatures) {
    console.warn("🛑 AI Features are disabled in settings.");
    return null;
  }

  const { mode, data } = parsedInput;

  // Determine provider order based on settings
  let providerChain = [];

  if (mode === 'VISION') {
    // Vision mode - use vision-capable models
    if (visionProvider === 'GEMINI') {
      providerChain = ['GEMINI'];
    } else if (visionProvider === 'COSMOSRP') {
      providerChain = ['COSMOSRP_2_5', 'COSMOSRP_2_1'];
    } else {
      // AUTO mode
      providerChain = ['GEMINI', 'COSMOSRP_2_5', 'COSMOSRP_2_1'];
    }
  } else {
    // Text mode - respect user preference
    if (preferredAiProvider === 'GEMINI') {
      providerChain = enableAutoFallback
        ? ['GEMINI', 'COSMOSRP_2_5', 'COSMOSRP_2_1', 'GPT_OSS']
        : ['GEMINI'];
    } else if (preferredAiProvider === 'COSMOSRP_2_5') {
      providerChain = enableAutoFallback
        ? ['COSMOSRP_2_5', 'COSMOSRP_2_1', 'GEMINI']
        : ['COSMOSRP_2_5'];
    } else if (preferredAiProvider === 'COSMOSRP_2_1') {
      providerChain = enableAutoFallback
        ? ['COSMOSRP_2_1', 'COSMOSRP_2_5', 'GEMINI']
        : ['COSMOSRP_2_1'];
    } else if (preferredAiProvider === 'GPT_OSS') {
      providerChain = enableAutoFallback
        ? ['GPT_OSS', 'GEMINI', 'COSMOSRP_2_5']
        : ['GPT_OSS'];
    }
  }

  const promptPrefix = type === 'CHAPTER_END'
    ? "You are an expert examiner. This is the end of a chapter. Create a comprehensive review."
    : "You are a Social Science tutor. Analyze this text.";

  // Try each provider in the chain
  let lastError = null;
  for (const provider of providerChain) {
    try {
      console.log(`🤖 Trying ${provider} in ${mode} mode...`);

      const textResponse = await tryProvider(provider, mode, data, type, promptPrefix);

      console.log(`📝 Raw response from ${provider}:`, textResponse.substring(0, 200) + '...');

      // Clean up markdown and various response formats
      let cleanedResponse = textResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      // Try to extract JSON if it's embedded in text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      console.log(`🧹 Cleaned response:`, cleanedResponse.substring(0, 200) + '...');

      let dataJSON;
      try {
        dataJSON = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error(`❌ JSON Parse Error for ${provider}:`, parseError.message);
        console.error(`Raw response that failed to parse:`, textResponse);
        throw new Error(`Invalid JSON response from ${provider}: ${parseError.message}`);
      }

      // 🍌 "Nano Banana" Step: Visual Concept Processing
      if (dataJSON.visual_concept) {
        console.log("🍌 Nano Banana logic triggered:", dataJSON.visual_concept);
        if (!dataJSON.quiz) dataJSON.quiz = [];
        dataJSON.quiz.push({
          type: 'visual',
          question: "What concept does this image represent?",
          answer: (dataJSON.summary_bullet_points && dataJSON.summary_bullet_points[0]) || "Key Concept",
          image_prompt: dataJSON.visual_concept
        });
      }

      console.log(`✅ AI Data Generated using ${provider}:`, dataJSON);
      return dataJSON;

    } catch (error) {
      console.warn(`❌ ${provider} failed:`, error.message);
      console.warn(`Error details:`, error);
      lastError = error;

      // If this is the last provider in the chain, throw the error
      if (provider === providerChain[providerChain.length - 1]) {
        console.error("❌ All AI providers failed. Last error:", error);
        return null;
      }

      // Otherwise, continue to next provider
      console.log(`⚠️ Falling back to next provider...`);
    }
  }

  console.error("❌ All AI providers failed.");
  return null;
};