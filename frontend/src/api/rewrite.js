import { API_BASE_URL } from '../utils/constants';

/**
 * Rewrites the provided text using AI to improve clarity or change tone.
 * @param {string} text - The input text to rewrite.
 * @param {string} [tone='professional'] - The desired tone (e.g., 'professional', 'casual', 'concise').
 * @returns {Promise<string>} - The rewritten text.
 */
export const rewriteText = async (text, tone = 'professional') => {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text is required.');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ai/rewrite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, tone }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Rewrite failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Backend returns { rewritten: string } or { result: string }
        const result = data.rewritten || data.result;

        if (!result) {
            throw new Error('AI returned an empty response.');
        }

        return result.trim();

    } catch (error) {
        console.error('Rewrite Text Error:', error);
        throw error;
    }
};
