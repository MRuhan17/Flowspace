import { summarize } from '../ai/summarize.js';
import { rewrite } from '../ai/rewrite.js';
import { generateStickyNote } from '../ai/stickyNote.js';
import { AppError } from '../middleware/errorHandler.js';

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
        const { prompt } = req.body;
        if (!prompt) throw new AppError('Prompt is required', 400);
        const result = await generateStickyNote(prompt);
        res.json({ result });
    } catch (error) {
        next(error);
    }
};
