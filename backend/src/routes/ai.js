import express from 'express';
// import { summarize } from '../ai/summarize.js';
// import { rewrite } from '../ai/rewrite.js';

const router = express.Router();

router.post('/summarize', (req, res) => {
    res.json({ message: "Summarize endpoint placeholder" });
});

router.post('/rewrite', (req, res) => {
    res.json({ message: "Rewrite endpoint placeholder" });
});

export default router;
