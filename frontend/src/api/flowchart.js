import axios from 'axios';

// Base URL handling (Vike/Vite env)
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * generateFlowchartFromText
 * 
 * Sends a text prompt to the AI backend to generate a structured flowchart.
 * 
 * @param {string} text - The user's prompt or description.
 * @returns {Promise<{nodes: Array, edges: Array}>} - Structured graph data.
 */
export const generateFlowchartFromText = async (text) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/ai/flowchart`, {
            prompt: text
        });

        // Backend should return { nodes, edges } or { data: { nodes, edges } }
        // Adjust based on the actual backend implementation. 
        // Assuming standard wrapping:
        if (response.data && response.data.nodes) {
            return response.data;
        } else if (response.data && response.data.data) {
            return response.data.data;
        }

        return response.data;
    } catch (error) {
        console.error("Error generating flowchart:", error);
        throw error;
    }
};
