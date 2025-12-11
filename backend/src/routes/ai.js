import express from 'express';
import { summarize } from '../ai/summarize.js';
import { rewrite } from '../ai/rewrite.js';
import { generateStickyNote } from '../ai/stickyNote.js';

const router = express.Router();

router.post('/summarize', async (req, res) => {
    try {
        const { text } = req.body;
        const result = await summarize(text);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/rewrite', async (req, res) => {
    try {
        const { text, tone } = req.body;
        const result = await rewrite(text, tone);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/sticky-note', async (req, res) => {
    try {
        const { prompt } = req.body;
        const result = await generateStickyNote(prompt);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
