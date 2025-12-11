import { API_BASE_URL } from '../utils/constants';

/**
 * Service for interacting with Backend AI Endpoints.
 */
export const aiService = {
    /**
     * Summarize board content or provided text.
     * @param {object} payload - { text: string } or board state
     */
    summarize: async (payload) => {
        try {
            const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data; // Expected { summary: string }
        } catch (error) {
            console.error("AI Summarize Error:", error);
            throw error;
        }
    },

    /**
     * Rewrite text with specific tone.
     * @param {string} text 
     * @param {string} tone - 'professional' | 'casual' | 'friendly'
     */
    rewrite: async (text, tone = 'professional') => {
        try {
            const response = await fetch(`${API_BASE_URL}/ai/rewrite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, tone })
            });

            if (!response.ok) throw new Error(response.statusText);

            const data = await response.json();
            return data; // Expected { rewritten: string }
        } catch (error) {
            console.error("AI Rewrite Error:", error);
            throw error;
        }
    },

    /**
     * Generate sticky note from Text or Image (Base64).
     * @param {object} payload - { text?: string, image?: string }
     */
    generateStickyNote: async (payload) => {
        try {
            const response = await fetch(`${API_BASE_URL}/ai/sticky-note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(response.statusText);

            const data = await response.json();
            return data; // Expected { content: { text, confidence } }
        } catch (error) {
            console.error("AI Sticky Note Error:", error);
            throw error;
        }
    }
};
