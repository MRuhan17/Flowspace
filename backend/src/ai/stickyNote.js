import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Generates a sticky note content from an image using AI Vision (OCR + Formatting).
 * @param {string} imageBase64 - Base64 encoded image string (with or without data prefix)
 * @returns {Promise<{text: string, confidence: number}>}
 */
export const generateStickyNote = async (imageBase64) => {
    try {
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            throw new Error('Invalid image data provided.');
        }

        // Ensure proper Data URI format
        const imageUrl = imageBase64.startsWith('data:')
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`;

        if (!process.env.OPENAI_API_KEY) {
            logger.warn('OPENAI_API_KEY missing. Returning mock OCR.');
            return {
                text: "Mock Sticky Note: Could not scan image (Missing API Key).",
                confidence: 0.0
            };
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Supports Vision
            messages: [
                {
                    role: "system",
                    content: "You are an OCR and helper assistant. Extract the handwriting or text from the image, clean up any noise, and format it as a concise sticky note string. If the image is blurry or contains no text, reply with 'NO_TEXT_FOUND'."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Transcribe this sticky note:" },
                        {
                            type: "image_url",
                            image_url: {
                                "url": imageUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 200,
        });

        const rawText = response.choices[0].message.content.trim();

        if (rawText === 'NO_TEXT_FOUND') {
            return {
                text: "",
                confidence: 0.1
            };
        }

        // Since we are using an LLM, 'confidence' is abstract. 
        // We'll trust the model by default if it produced text.
        return {
            text: rawText,
            confidence: 0.95
        };

    } catch (error) {
        logger.error('Sticky Note Generation Failed:', error);

        // Handle specific API errors if needed
        return {
            text: "Failed to process image.",
            confidence: 0.0
        };
    }
};
