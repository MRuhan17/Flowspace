import { summarizeBoard, quickSummary } from '../ai/summarize.js';
import { rewrite } from '../ai/rewrite.js';
import { generateStickyNote } from '../ai/stickyNote.js';
import { generateFlowchart } from '../ai/flowchart.js';
import { analyzeBoard } from '../ai/designAssistant.js';
import { generateTheme, applyThemeToBoard } from '../ai/themeGenerator.js';
import { analyzeBoard as interpretBoard, quickAnalyze } from '../ai/boardInterpreter.js';
import { generateWorkflow, simplifyWorkflow, optimizeWorkflow, expandWorkflow, convertToFlowchart, convertToTimeline } from '../ai/workflowAssistant.js';
import { validateDiagram, quickValidate } from '../ai/diagramValidator.js';
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

export const generateColorTheme = async (req, res, next) => {
    try {
        const { boardContent, context } = req.body;
        if (!boardContent) throw new AppError('Board content is required', 400);

        const result = await generateTheme(boardContent, context);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const applyTheme = async (req, res, next) => {
    try {
        const { boardContent, palette, applyTo } = req.body;
        if (!boardContent || !palette) {
            throw new AppError('Board content and palette are required', 400);
        }

        const result = applyThemeToBoard(boardContent, palette, applyTo);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Interpret board semantics - Deep analysis of relationships and patterns
 */
export const interpretBoardSemantics = async (req, res, next) => {
    try {
        const { boardJSON, options } = req.body;
        if (!boardJSON) {
            throw new AppError('Board JSON is required', 400);
        }

        const result = await interpretBoard(boardJSON, options);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Quick board analysis - Fast heuristic-based analysis
 */
export const quickBoardAnalysis = async (req, res, next) => {
    try {
        const { boardJSON } = req.body;
        if (!boardJSON) {
            throw new AppError('Board JSON is required', 400);
        }

        const result = await quickAnalyze(boardJSON);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate workflow from board data or semantic map
 */
export const generateWorkflowFromBoard = async (req, res, next) => {
    try {
        const { input, options } = req.body;
        if (!input) {
            throw new AppError('Input data (board or semantic map) is required', 400);
        }

        const result = await generateWorkflow(input, options);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Simplify existing workflow
 */
export const simplifyBoardWorkflow = async (req, res, next) => {
    try {
        const { boardData } = req.body;
        if (!boardData) {
            throw new AppError('Board data is required', 400);
        }

        const result = await simplifyWorkflow(boardData);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Optimize existing workflow
 */
export const optimizeBoardWorkflow = async (req, res, next) => {
    try {
        const { boardData } = req.body;
        if (!boardData) {
            throw new AppError('Board data is required', 400);
        }

        const result = await optimizeWorkflow(boardData);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Expand workflow with more details
 */
export const expandBoardWorkflow = async (req, res, next) => {
    try {
        const { boardData } = req.body;
        if (!boardData) {
            throw new AppError('Board data is required', 400);
        }

        const result = await expandWorkflow(boardData);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Convert board to flowchart
 */
export const convertBoardToFlowchart = async (req, res, next) => {
    try {
        const { boardData } = req.body;
        if (!boardData) {
            throw new AppError('Board data is required', 400);
        }

        const result = await convertToFlowchart(boardData);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Convert board to timeline
 */
export const convertBoardToTimeline = async (req, res, next) => {
    try {
        const { boardData } = req.body;
        if (!boardData) {
            throw new AppError('Board data is required', 400);
        }

        const result = await convertToTimeline(boardData);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate diagram structure and detect issues
 */
export const validateBoardDiagram = async (req, res, next) => {
    try {
        const { boardSemanticMap, options } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const result = await validateDiagram(boardSemanticMap, options);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Quick diagram validation (heuristic-only)
 */
export const quickValidateDiagram = async (req, res, next) => {
    try {
        const { boardSemanticMap } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const result = await quickValidate(boardSemanticMap);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Enhanced board summarization with multi-layer output
 */
export const summarizeBoardEnhanced = async (req, res, next) => {
    try {
        const { boardData, options } = req.body;
        if (!boardData) {
            throw new AppError('Board data is required', 400);
        }

        const result = await summarizeBoard(boardData, options);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Quick board summary (brief version)
 */
export const quickBoardSummary = async (req, res, next) => {
    try {
        const { boardData } = req.body;
        if (!boardData) {
            throw new AppError('Board data is required', 400);
        }

        const result = await quickSummary(boardData);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

