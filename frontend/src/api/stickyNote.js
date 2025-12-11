import { API_BASE_URL } from '../utils/constants';

/**
 * Generates a sticky note content from an image (OCR + Summarization).
 * @param {string} imageBase64 - Base64 encoded image string.
 * @returns {Promise<{text: string, confidence: number}>} - The extracted and formatted text.
 */
export const generateStickyNote = async (imageBase64) => {
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        throw new Error('Invalid input: Image data (base64) is required.');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ai/sticky-note`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageBase64 }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Sticky Note Generation failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Backend returns standard response format: { success: true, data: { text, confidence } }
        // We need to handle potentially wrapped or direct responses depending on final backend controller structure

        if (data.success && data.data) {
            return data.data;
        } else if (data.text) {
            // Fallback if backend structure differs slightly
            return data;
        } else if (data.result) {
            return data.result;
        }

        throw new Error('Invalid response structure from AI service');

    } catch (error) {
        console.error('Generate Sticky Note Error:', error);
        throw error;
    }
};
