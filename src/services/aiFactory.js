import { GoogleGenerativeAI } from "@google/generative-ai";
import useSettingsStore from '../store/useSettingsStore';

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

// --- MAIN FUNCTION ---
/**
 * Generates activities from PDF content.
 * @param {object} parsedInput - { mode: 'TEXT'|'VISION', data: string|string[] }
 * @param {string} type - 'MICRO' or 'CHAPTER_END'.
 */
export const generateActivities = async (parsedInput, type = 'MICRO') => {

  const { enableAiFeatures } = useSettingsStore.getState();
  if (!enableAiFeatures) {
    console.warn("🛑 AI Features are disabled in settings.");
    return null;
  }

  const { mode, data } = parsedInput;

  try {
    console.log(`🤖 Gemini is thinking in ${mode} mode...`);

    // Refresh instance with latest key
    const genAI = getGenAI();
    // Use Gemini 2.5 Flash for EVERYTHING (Multimodal)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let result;

    // --- SCENARIO A: SCANNED PDF (VISION MODE) ---
    if (mode === 'VISION') {
      const images = Array.isArray(data) ? data : [data];
      const prompt = `You are an expert tutor. Analyze these textbook page images. Extract key concepts and create a study activity set. ${JSON_INSTRUCTION}`;

      const imageParts = images.map(img => ({
        inlineData: { data: img, mimeType: "image/jpeg" }
      }));

      result = await model.generateContent([prompt, ...imageParts]);
    }
    // --- SCENARIO B: STANDARD PDF (TEXT MODE) ---
    else {
      const promptPrefix = type === 'CHAPTER_END'
        ? "You are an expert examiner. This is the end of a chapter. Create a comprehensive review."
        : "You are a Social Science tutor. Analyze this text.";

      result = await model.generateContent([
        `${promptPrefix} ${JSON_INSTRUCTION}`,
        data
      ]);
    }

    // Process Response
    const response = await result.response;
    let textResponse = response.text();

    // Clean up markdown
    textResponse = textResponse.replace(/```json|```/g, '').trim();
    const dataJSON = JSON.parse(textResponse);

    // 🍌 "Nano Banana" Step: Visual Concept Processing
    // Just return the prompt here, the Caller (BookViewer) will handle the generation
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

    console.log("✅ AI Data Generated:", dataJSON);
    return dataJSON;

  } catch (error) {
    console.error("❌ AI Generation Failed:", error);
    return null;
  }
};