import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

const VALID_TONES = ['clean', 'concise', 'professional', 'casual', 'friendly'];

/**
 * Rewrites text with a specific tone.
 * @param {string} text 
 * @param {string} tone 
 * @returns {Promise<string>}
 */
export const rewrite = async (text, tone = 'professional') => {
    try {
        if (!text || !text.trim()) {
            throw new Error("Input text cannot be empty.");
        }

        const selectedTone = VALID_TONES.includes(tone) ? tone : 'professional';

        if (!process.env.OPENAI_API_KEY) {
            logger.warn("OPENAI_API_KEY missing. Using mock rewrite.");
            return `(Mock ${selectedTone}) ${text}`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a professional writing assistant. Rewrite the user's text to be ${selectedTone}. Maintain the original meaning but improve clarity and style. Do not include quotes or conversational filler.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        });

        const result = completion.choices[0].message.content.trim();

        // Basic Content Filtering (in case of empty or harmful failure modes)
        if (!result || result.length === 0) {
            logger.warn("AI returned empty rewrite response");
            return text; // Fallback to original
        }

        return result;

    } catch (error) {
        logger.error("AI Rewrite Failed:", error);
        throw new Error("Failed to rewrite text. Please try again.");
    }
};

// Alias for backward compatibility or clearer naming if imported elsewhere
export const rewriteText = rewrite;
