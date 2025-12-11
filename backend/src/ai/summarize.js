import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Converts raw board data into a textual representation for the AI.
 */
function stringifyBoard(elements) {
    if (!Array.isArray(elements) || elements.length === 0) {
        return "Empty whiteboard.";
    }

    // Heuristics to group or describe elements
    const textNodes = elements.filter(e => e.type === 'text' || e.type === 'sticky');
    const shapes = elements.filter(e => e.type !== 'text' && e.type !== 'sticky');

    let description = `Whiteboard contains ${elements.length} elements.\n`;

    if (textNodes.length > 0) {
        description += `Text content found:\n`;
        textNodes.forEach(t => {
            description += `- "${t.text}" (Color: ${t.color || 'default'})\n`;
        });
    }

    if (shapes.length > 0) {
        description += `Visual elements:\n`;
        // Group by rough type if available, else just list counts
        const typeCounts = shapes.reduce((acc, curr) => {
            const t = curr.tool || curr.type || 'unknown';
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {});

        Object.keys(typeCounts).forEach(type => {
            description += `- ${typeCounts[type]} ${type} element(s)\n`;
        });
    }

    return description;
}

/**
 * Main summary function
 * Handles both plain text and board JSON objects.
 */
export const summarize = async (content) => {
    try {
        let promptContent = "";

        if (typeof content === 'string') {
            promptContent = `Summarize the following text concisely:\n\n${content}`;
        } else if (typeof content === 'object') {
            const boardDescription = stringifyBoard(content);
            promptContent = `You are an intelligent assistant analyzing a whiteboard session. 
Based on the following elements and text found on the board, provide a clear, human-readable summary of the ideas, flow, and content.
Ignore technical artifacts. Focus on the meaning.

Board Data:
${boardDescription}

Summary:`;
        } else {
            return "Invalid content provided for summarization.";
        }

        if (!process.env.OPENAI_API_KEY) {
            logger.warn("OPENAI_API_KEY not found. Returning Clean Mock Response.");
            return `(AI Mock) This board appears to discuss ${typeof content === 'object' ? content.length + ' elements' : 'content'}. Please configure OpenAI API key for real analysis.`;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective model
            messages: [
                { role: "system", content: "You are a helpful and concise collaborative assistant." },
                { role: "user", content: promptContent }
            ],
            max_tokens: 300,
            temperature: 0.5
        });

        return response.choices[0].message.content.trim();

    } catch (error) {
        logger.error("AI Summarization Failed:", error);
        return "We couldn't generate a summary right now. Please try again later.";
    }
};

// Kept for backward compatibility if needed specifically
export const summarizeBoard = summarize;
