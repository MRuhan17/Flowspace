import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Analyzes board state and user intent to provide design intelligence.
 * @param {object} boardJSON - Current state of the board (nodes, edges, strokes)
 * @param {string} mode - 'colors' | 'layout' | 'rewrite' | 'semantic' | 'diagram'
 * @param {string} content - specific text or goal from user
 * @returns {Promise<object>} Structured design suggestions
 */
export async function analyzeBoard(boardJSON, mode, content) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // safe summarization of board to avoid token limits
    const boardSummary = boardJSON ? JSON.stringify(boardJSON).substring(0, 8000) : "{}";

    // Base System Instruction
    const baseInstruction = `
        You are an advanced Design AI Assistant for a whiteboard application.
        Your goal is to analyze the board state and user request to provide structured, actionable design data.
        Return ONLY valid JSON.
    `;

    let specificPrompt = "";

    switch (mode) {
        case 'colors':
            specificPrompt = `
                Goal: Suggest a color palette based on context: "${content}" and current board content.
                Output JSON Schema:
                {
                    "suggestions": [
                        { "title": "Palette Name", "description": "Usage guide", "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"] }
                    ],
                    "summary": "Brief explanation of why this palette fits."
                }
            `;
            break;

        case 'layout':
            specificPrompt = `
                Goal: Analyze the board and suggest layout improvements or spatial organization.
                User Goal: "${content}"
                Board Context: ${boardSummary}
                Output JSON Schema:
                {
                    "summary": "Analysis of current layout.",
                    "suggestions": [
                        { "title": "Actionable Tip", "description": "Specific instruction on what to move or align." }
                    ]
                }
            `;
            break;

        case 'rewrite':
            specificPrompt = `
                Goal: Rewrite the provided text for clarity, professionalism, or specific tone.
                Text to Rewrite: "${content}"
                Output JSON Schema:
                {
                    "rewrittenText": "The best version of the text.",
                    "suggestions": [
                        { "title": "Alternative 1", "description": "Alternative text option." },
                        { "title": "Tone Analysis", "description": "Why the rewrites work." }
                    ]
                }
            `;
            break;

        case 'semantic':
            specificPrompt = `
                Goal: Identify semantic groups in the board elements.
                Board Context: ${boardSummary}
                Output JSON Schema:
                {
                    "summary": "Found X logical groups.",
                    "suggestions": [
                         { "title": "Group Name", "description": "IDs: [list of element ids to group]" }
                    ]
                }
            `;
            break;

        case 'diagram':
            specificPrompt = `
                Goal: Generate a node-edge structure for a flowchart/diagram based on description.
                Description: "${content}"
                Output JSON Schema:
                {
                    "summary": "Generated flowchart structure.",
                    "nodes": [{ "id": "string", "type": "node", "x": 0, "y": 0, "data": { "label": "string" } }],
                    "edges": [{ "id": "string", "source": "id", "target": "id" }]
                }
            `;
            break;

        default:
            specificPrompt = `
                Goal: General design assistance.
                Input: "${content}"
                Output JSON Schema:
                {
                    "summary": "General advice.",
                    "suggestions": [{ "title": "Advice", "description": "Details" }]
                }
             `;
    }

    const fullPrompt = `${baseInstruction}\n\n${specificPrompt}\n\nEnsure valid JSON output. No markdown blocks.`;

    try {
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        // Clean markdown if present
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('AI Analyze Board Error:', error);
        // Fallback structure
        return {
            summary: "AI processing failed.",
            suggestions: [],
            nodes: [],
            edges: [],
            rewrittenText: null
        };
    }
}
