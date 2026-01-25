import useSettingsStore from '../store/useSettingsStore';

/**
 * Pawan.krd API Service
 * Supports CosmosRP-2.5, CosmosRP-2.1 (both with vision), and GPT-OSS-20B
 */

// Model configurations
const MODELS = {
    COSMOSRP_2_5: {
        name: 'cosmosrp-2.5',
        baseUrl: 'https://api.pawan.krd/cosmosrp-2.5/v1',
        instructedUrl: 'https://api.pawan.krd/cosmosrp-2.5-it/v1',
        vision: true,
        temperature: { min: 0.6, max: 1.0, recommended: 0.7 },
        contextSize: 16384,
        quality: 'Excellent, optimized for roleplay'
    },
    COSMOSRP_2_1: {
        name: 'cosmosrp-2.1',
        baseUrl: 'https://api.pawan.krd/cosmosrp-2.1/v1',
        instructedUrl: 'https://api.pawan.krd/cosmosrp-2.1-it/v1',
        vision: true,
        temperature: { min: 0.6, max: 1.5, recommended: 1.2 },
        contextSize: 16384,
        quality: 'Excellent, optimized for roleplay'
    },
    GPT_OSS: {
        name: 'gpt-oss-20b',
        baseUrl: 'https://api.pawan.krd/gpt-oss-20b/v1',
        vision: false,
        temperature: { min: 0.3, max: 1.0, recommended: 0.8 },
        contextSize: 32768,
        quality: 'Excellent for general tasks',
        thinking: true,
        toolCalling: true
    }
};

/**
 * Generate content using Pawan API (OpenAI-compatible endpoint)
 * @param {string} modelKey - COSMOSRP_2_5, COSMOSRP_2_1, or GPT_OSS
 * @param {string} textPrompt - The text prompt
 * @param {Array<string>} images - Optional array of base64 images for vision models
 * @param {boolean} useInstructed - Use instructed version (more natural responses)
 * @returns {Promise<string>} - The generated response
 */
export const generateWithPawan = async (
    modelKey,
    textPrompt,
    images = null,
    useInstructed = false
) => {
    const { pawanApiKey } = useSettingsStore.getState();
    const apiKey = pawanApiKey || import.meta.env.VITE_PAWAN_API_KEY;

    const model = MODELS[modelKey];
    if (!model) {
        throw new Error(`Unknown model: ${modelKey}`);
    }

    // Check if vision is requested but not supported
    if (images && !model.vision) {
        throw new Error(`Model ${model.name} does not support vision`);
    }

    // Build base URL
    const baseUrl = useInstructed && model.instructedUrl
        ? model.instructedUrl
        : model.baseUrl;

    const endpoint = `${baseUrl}/chat/completions`;

    // Build messages array
    const messages = [];

    if (images && model.vision) {
        // Vision mode - create content with images
        const content = [
            { type: 'text', text: textPrompt }
        ];

        // Add images
        images.forEach(img => {
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${img}`
                }
            });
        });

        messages.push({
            role: 'user',
            content: content
        });
    } else {
        // Text-only mode
        messages.push({
            role: 'user',
            content: textPrompt
        });
    }

    // Build request body
    const requestBody = {
        model: model.name,
        messages: messages,
        temperature: model.temperature.recommended,
        max_tokens: 4000
    };

    // Special handling for Pawan vision models - they have strict payload limits
    if (images && images.length > 2 && (modelKey === 'COSMOSRP_2_5' || modelKey === 'COSMOSRP_2_1')) {
        console.warn(`⚠️ Pawan vision models limited to 2 images max. Reducing from ${images.length} to 2.`);

        // Rebuild messages with only last 2 images
        const reducedImages = images.slice(-2);
        const content = [
            { type: 'text', text: textPrompt }
        ];

        reducedImages.forEach(img => {
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${img}`
                }
            });
        });

        requestBody.messages = [{
            role: 'user',
            content: content
        }];
    }

    try {
        console.log(`🚀 Calling Pawan API: ${model.name} (${useInstructed ? 'instructed' : 'standard'})`);

        // Log payload size for vision requests
        if (images && images.length > 0) {
            const estimatedSize = images.reduce((sum, img) => sum + img.length, 0) / 1024;
            console.log(`📊 Vision request with ${images.length} images, ~${estimatedSize.toFixed(0)}KB base64 data`);
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        // Add API key if available
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Pawan API Error (${response.status}):`, errorText);
                throw new Error(`Pawan API request failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // Extract response text
            const responseText = data.choices?.[0]?.message?.content;

            if (!responseText) {
                console.error('❌ Empty response from Pawan API:', data);

                // Check for specific Pawan API errors
                if (data.error?.code === 'server_error' && data.error?.message?.includes('large character/persona')) {
                    throw new Error('Image payload too large for Pawan API. Reduce scanned pages to 1 or 2 in settings.');
                }

                throw new Error('No content in Pawan API response');
            }

            console.log(`✅ Pawan API response received (${model.name})`);
            return responseText;

        } catch (fetchError) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                console.error(`❌ Pawan API timeout (60s) for ${model.name}`);
                throw new Error(`API request timed out after 60 seconds. Try reducing the number of pages in settings.`);
            }
            throw fetchError;
        }

    } catch (error) {
        console.error(`❌ Pawan API Error (${model.name}):`, error);
        throw error;
    }
};

/**
 * Get model configuration
 * @param {string} modelKey - Model key
 * @returns {object} - Model configuration
 */
export const getModelConfig = (modelKey) => {
    return MODELS[modelKey] || null;
};

/**
 * Get all available models
 * @returns {object} - All model configurations
 */
export const getAllModels = () => {
    return MODELS;
};

/**
 * Check if Pawan API is available (has API key or can use free tier)
 * @returns {boolean}
 */
export const isPawanAvailable = () => {
    const { pawanApiKey } = useSettingsStore.getState();
    // Pawan API can work without a key (limited to 8k context)
    return true;
};
