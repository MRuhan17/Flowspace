import express from 'express';
import * as aiController from '../controllers/aiController.js';
import { aiRateLimiter, heavyAiRateLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Apply standard rate limit to all AI routes
router.use(aiRateLimiter);
// For consistency with previous refactor where logic moved to controllers:

router.post('/summarize', aiController.summarizeText);
router.post('/rewrite', aiController.rewriteText);
router.post('/sticky-note', aiController.createStickyNote);
router.post('/flowchart', aiController.generateFlowchartDiagram);
router.post('/design-assistant', aiController.handleDesignAssistant);
router.post('/theme/generate', aiController.generateColorTheme);
router.post('/theme/apply', aiController.applyTheme);
router.post('/interpret', aiController.interpretBoardSemantics);
router.post('/analyze/quick', aiController.quickBoardAnalysis);
router.post('/workflow/generate', aiController.generateWorkflowFromBoard);
router.post('/workflow/simplify', aiController.simplifyBoardWorkflow);
router.post('/workflow/optimize', aiController.optimizeBoardWorkflow);
router.post('/workflow/expand', aiController.expandBoardWorkflow);
router.post('/workflow/convert-to-flowchart', aiController.convertBoardToFlowchart);
router.post('/workflow/convert-to-timeline', aiController.convertBoardToTimeline);
router.post('/validate', aiController.validateBoardDiagram);
router.post('/validate/quick', aiController.quickValidateDiagram);
router.post('/summary/enhanced', aiController.summarizeBoardEnhanced);
router.post('/summary/quick', aiController.quickBoardSummary);
router.post('/memory/store', aiController.storeBoardMemory);
router.post('/memory/retrieve', aiController.retrieveBoardMemories);
router.post('/memory/context', aiController.generateMemoryContext);
router.get('/memory/:boardId', aiController.getBoardMemories);
router.delete('/memory/:boardId/:memoryId', aiController.deleteBoardMemory);
router.delete('/memory/:boardId', aiController.clearBoardMemories);
router.get('/memory/:boardId/stats', aiController.getBoardMemoryStats);
router.post('/memory/auto-store', aiController.autoStoreSummaryMemory);
router.post('/layout/recommend', aiController.getLayoutRecommendation);
router.post('/layout/recommend/quick', aiController.getQuickLayoutRecommendation);
router.post('/layout/options', aiController.getMultipleLayoutOptions);
router.post('/color/generate', aiController.getColorPalette);
router.post('/color/generate/quick', aiController.getQuickColorPalette);
router.post('/color/from-color', aiController.getPaletteFromColor);
router.post('/story/generate', aiController.generateBoardStory);
router.post('/story/quick', aiController.getQuickStory);
router.post('/story/elevator-pitch', aiController.getElevatorPitch);
router.post('/story/detailed', aiController.getDetailedNarrative);
router.post('/query/ask', aiController.askBoardQuestion);
router.post('/query/batch', aiController.batchAskBoardQuestions);
router.post('/query/quick', aiController.quickAskBoard);
router.post('/query/suggestions', aiController.getSuggestedQuestions);
router.post('/suggestions/generate', aiController.getSmartSuggestions);
router.post('/suggestions/quick', aiController.getQuickSuggestions);
router.post('/suggestions/high-priority', aiController.getHighPrioritySuggestionsOnly);
router.post('/from-screenshot', heavyAiRateLimiter, aiController.convertScreenshotToDiagram);
router.post('/cleanup', heavyAiRateLimiter, aiController.handleCleanupBoard);
router.post('/presentation', heavyAiRateLimiter, aiController.handleGeneratePresentation);
router.post('/ux-feedback', heavyAiRateLimiter, aiController.handleUXAnalysis);

export default router;











