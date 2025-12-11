import { API_BASE_URL } from '../utils/constants';

/**
 * Auto-layout service for organizing canvas objects
 */
export const layoutService = {
    /**
     * Calculate optimal layout for board objects
     * @param {Array} objects - Array of objects with id, x, y, width, height, text, type
     * @param {string} strategy - 'smart' | 'grid' | 'vertical' | 'horizontal'
     */
    autoLayout: async (objects, strategy = 'smart') => {
        try {
            const response = await fetch(`${API_BASE_URL}/layout/auto-layout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ objects, strategy })
            });

            if (!response.ok) {
                throw new Error(`Layout failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data.objects; // Return layouted objects
        } catch (error) {
            console.error("Auto Layout Error:", error);
            throw error;
        }
    }
};
