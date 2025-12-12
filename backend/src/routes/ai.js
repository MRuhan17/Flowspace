import express from 'express';
import * as aiController from '../controllers/aiController.js';

const router = express.Router();

// validation/error wrappers could stay here or move to controller validation
// For consistency with previous refactor where logic moved to controllers:

router.post('/summarize', aiController.summarizeText);
router.post('/rewrite', aiController.rewriteText);
router.post('/sticky-note', aiController.createStickyNote);
router.post('/flowchart', aiController.generateFlowchartDiagram);
router.post('/design-assistant', aiController.handleDesignAssistant);

export default router;
