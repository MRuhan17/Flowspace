import express from 'express';
import * as aiController from '../controllers/aiController.js';

const router = express.Router();

router.post('/summarize', aiController.summarizeText);
router.post('/rewrite', aiController.rewriteText);
router.post('/sticky-note', aiController.createStickyNote);

export default router;
