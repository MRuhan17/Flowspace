import express from 'express';
import { summarize } from '../ai/summarize.js';
import { rewrite } from '../ai/rewrite.js';
import { generateStickyNote } from '../ai/stickyNote.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// /api/ai/summarize
router.post('/summarize', asyncHandler(async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        throw new AppError('Valid text input is required for summarization', 400);
    }

    // Call AI Service
    const summary = await summarize(text);

    res.json({
        success: true,
        data: { summary }
    });
}));

// /api/ai/rewrite
router.post('/rewrite', asyncHandler(async (req, res) => {
    const { text, tone } = req.body;
    if (!text || typeof text !== 'string') {
        throw new AppError('Valid text input is required for rewriting', 400);
    }

    // Call AI Service
    const rewritten = await rewrite(text, tone || 'professional');

    res.json({
        success: true,
        data: { rewritten }
    });
}));

// /api/ai/sticky-note
router.post('/sticky-note', asyncHandler(async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
        throw new AppError('Valid prompt is required to generate sticky note', 400);
    }

    // Call AI Service
    const content = await generateStickyNote(prompt);

    res.json({
        success: true,
        data: { content }
    });
}));

export default router;
