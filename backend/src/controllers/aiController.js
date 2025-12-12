import { summarize } from '../ai/summarize.js';
import { rewrite } from '../ai/rewrite.js';
import { generateStickyNote } from '../ai/stickyNote.js';
import { generateFlowchart } from '../ai/flowchart.js';
import { analyzeBoard } from '../ai/designAssistant.js';
import { AppError } from '../middleware/errorHandler.js';


// ... existing functions ...


export const handleDesignAssistant = async (req, res, next) => {
    try {
        const { mode, content, boardJSON } = req.body;
        if (!mode || !content) throw new AppError('Mode and Content are required', 400);

        const result = await analyzeBoard(boardJSON, mode, content);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const summarizeText = async (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text) throw new AppError('Text is required', 400);
        const result = await summarize(text);
        res.json({ result });
    } catch (error) {
        next(error);
    }
};

export const rewriteText = async (req, res, next) => {
    try {
        const { text, tone } = req.body;
        if (!text) throw new AppError('Text is required', 400);
        const result = await rewrite(text, tone);
        res.json({ result });
    } catch (error) {
        next(error);
    }
};

export const createStickyNote = async (req, res, next) => {
    try {
        const { image } = req.body;
        if (!image) throw new AppError('Image data (base64) is required', 400);

        const result = await generateStickyNote(image);

        // Wrap for the generic response handler or return directly if handler is different
        // The router uses consistent response format, but controller returning direct result?
        // Wait, router calls controller. 
        // Let's match the router's expectation or just return json here?
        // Router code: calls controller.createStickyNote
        // Let's see router implementation in next step.
        // Actually, previous router implementation was:
        // router.post('/sticky-note', asyncHandler(async (req, res) => { const { prompt } = req.body; ... }));
        // I need to align them. I will update controller to be clean and router to handle properly.
        // Or better: Use the controller logic.

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const generateFlowchartDiagram = async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt) throw new AppError('Prompt text is required', 400);

        const result = await generateFlowchart(prompt);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
