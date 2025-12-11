import { API_BASE_URL } from '../utils/constants';

/**
 * Summarizes the board content by sending it to the backend AI service.
 * @param {object|string} boardJSON - The JSON representation of the board or raw text.
 * @param {number} timeoutMs - Timeout in milliseconds (default 30000).
 * @returns {Promise<string>} - The generated summary text.
 */
export const summarizeBoard = async (boardJSON, timeoutMs = 30000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const payload = typeof boardJSON === 'string' ? { text: boardJSON } : { board: boardJSON };

        const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();

        if (!data || (!data.summary && !data.result)) {
            throw new Error('Invalid response format from AI service');
        }

        return data.summary || data.result;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again with less content.');
        }

        console.error('Summarize Board Error:', error);
        throw error;
    }
};
