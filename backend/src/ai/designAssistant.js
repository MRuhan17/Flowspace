import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Processes design assistant requests using Gemini.
 * @param {string} mode - 'colors' | 'layout' | 'rewrite' | 'diagram'
 * @param {string} content - User query or content to process
 * @param {object} boardState - Current state of the board (optional)
 * @returns {Promise<object>} Structured response based on mode
 */
export async function processDesignQuery(mode, content, boardState) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    let prompt = '';

    // Construct Prompt based on Mode
    switch (mode) {
        case 'colors':
            prompt = `
                You are a professional UI/UX designer.
                Based on the following description or context, suggest a harmonized color palette of 5 colors.
                Context: "${content}"
                
                Output JSON format:
                {
                    "palette": [
                        { "hex": "#code", "name": "Color Name", "usage": "Background/Accent/Text" }
                    ],
                    "rationale": "Brief explanation of the choice."
                }
            `;
            break;

        case 'layout':
            // Summarize board state if provided
            const boardSummary = boardState ? JSON.stringify(boardState).substring(0, 5000) : "Empty board";
            prompt = `
                You are a layout expert for diagrams and whiteboards.
                Analyze the following board state summary and the user's goal.
                User Goal: "${content}"
                Board Summary: ${boardSummary}

                Provide 3 actionable layout tips or improvements.
                Output JSON format:
                {
                    "tips": [
                        { "title": "Tip Title", "description": "Actionable advice." }
                    ]
                }
            `;
            break;

        case 'rewrite':
            prompt = `
                Rewrite the following text to be more concise, professional, and clear.
                Text: "${content}"
                
                Output JSON format:
                {
                    "rewritten": "New text here",
                    "alternatives": ["Alt 1", "Alt 2"]
                }
            `;
            break;

        case 'diagram':
            prompt = `
                Generate a node-edge flowchart structure based on the description.
                Description: "${content}"
                
                Output JSON format:
                {
                    "nodes": [{ "id": "1", "label": "Start", "type": "node" }],
                    "edges": [{ "source": "1", "target": "2" }]
                }
             `;
            break;

        default:
            throw new Error(`Unknown mode: ${mode}`);
    }

    // Execute
    try {
        const result = await model.generateContent(prompt + "\n\nResponse must be valid JSON without markdown formatting.");
        const response = await result.response;
        const text = response.text();

        // Clean and Parse JSON
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);

    } catch (error) {
        console.error('AI Processing Error:', error);
        throw new Error('Failed to generate AI response');
    }
}
