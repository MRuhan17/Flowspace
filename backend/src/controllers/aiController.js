import { summarizeBoard, quickSummary } from '../ai/summarize.js';
import { rewrite } from '../ai/rewrite.js';
import { generateStickyNote } from '../ai/stickyNote.js';
import { generateFlowchart } from '../ai/flowchart.js';
import { analyzeBoard } from '../ai/designAssistant.js';
import { generateTheme, applyThemeToBoard } from '../ai/themeGenerator.js';
import { analyzeBoard as interpretBoard, quickAnalyze } from '../ai/boardInterpreter.js';
import { generateWorkflow, simplifyWorkflow, optimizeWorkflow, expandWorkflow, convertToFlowchart, convertToTimeline } from '../ai/workflowAssistant.js';
import { validateDiagram, quickValidate } from '../ai/diagramValidator.js';
import { storeMemory, retrieveMemories, generateContext, getAllMemories, deleteMemory, clearMemories, getMemoryStatistics, autoStoreFromSummary } from '../ai/memory.js';
import { layoutAdvisor, quickLayoutRecommendation, getLayoutOptions } from '../ai/layoutAdvisor.js';
import { generateColorPalette, quickColorPalette, generatePaletteFromColor } from '../ai/colorSuggest.js';
import { storyExplain, quickStory, elevatorPitch, detailedNarrative } from '../ai/storyTeller.js';
import { askBoard, batchAskBoard, quickAsk, suggestQuestions } from '../ai/query.js';
import { generateSmartSuggestions, quickSuggestions, getHighPrioritySuggestions } from '../ai/smartSuggestions.js';
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

/**
 * Store a memory for a board
 */
export const storeBoardMemory = async (req, res, next) => {
    try {
        const { boardId, memoryData } = req.body;
        if (!boardId || !memoryData) {
            throw new AppError('Board ID and memory data are required', 400);
        }

        const memory = await storeMemory(boardId, memoryData);

        res.json({
            success: true,
            data: memory
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieve relevant memories for a query
 */
export const retrieveBoardMemories = async (req, res, next) => {
    try {
        const { boardId, query, topK } = req.body;
        if (!boardId || !query) {
            throw new AppError('Board ID and query are required', 400);
        }

        const memories = await retrieveMemories(boardId, query, topK);

        res.json({
            success: true,
            data: memories
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate context from memories
 */
export const generateMemoryContext = async (req, res, next) => {
    try {
        const { boardId, query, topK } = req.body;
        if (!boardId || !query) {
            throw new AppError('Board ID and query are required', 400);
        }

        const context = await generateContext(boardId, query, topK);

        res.json({
            success: true,
            data: { context }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all memories for a board
 */
export const getBoardMemories = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        if (!boardId) {
            throw new AppError('Board ID is required', 400);
        }

        const memories = await getAllMemories(boardId);

        res.json({
            success: true,
            data: memories
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a specific memory
 */
export const deleteBoardMemory = async (req, res, next) => {
    try {
        const { boardId, memoryId } = req.params;
        if (!boardId || !memoryId) {
            throw new AppError('Board ID and memory ID are required', 400);
        }

        const success = await deleteMemory(boardId, memoryId);

        res.json({
            success: success,
            message: success ? 'Memory deleted' : 'Memory not found'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Clear all memories for a board
 */
export const clearBoardMemories = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        if (!boardId) {
            throw new AppError('Board ID is required', 400);
        }

        await clearMemories(boardId);

        res.json({
            success: true,
            message: 'All memories cleared'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get memory statistics
 */
export const getBoardMemoryStats = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        if (!boardId) {
            throw new AppError('Board ID is required', 400);
        }

        const stats = await getMemoryStatistics(boardId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Auto-store memory from summary
 */
export const autoStoreSummaryMemory = async (req, res, next) => {
    try {
        const { boardId, summary } = req.body;
        if (!boardId || !summary) {
            throw new AppError('Board ID and summary are required', 400);
        }

        const memory = await autoStoreFromSummary(boardId, summary);

        res.json({
            success: true,
            data: memory
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get layout recommendation for a board
 */
export const getLayoutRecommendation = async (req, res, next) => {
    try {
        const { boardSemanticMap, options } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const recommendation = await layoutAdvisor(boardSemanticMap, options);

        res.json({
            success: true,
            data: recommendation
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get quick layout recommendation (heuristic only)
 */
export const getQuickLayoutRecommendation = async (req, res, next) => {
    try {
        const { boardSemanticMap } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const recommendation = await quickLayoutRecommendation(boardSemanticMap);

        res.json({
            success: true,
            data: recommendation
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get multiple layout options
 */
export const getMultipleLayoutOptions = async (req, res, next) => {
    try {
        const { boardSemanticMap } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const options = await getLayoutOptions(boardSemanticMap);

        res.json({
            success: true,
            data: options
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate color palette for a board
 */
export const getColorPalette = async (req, res, next) => {
    try {
        const { boardSemanticMap, options } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const palette = await generateColorPalette(boardSemanticMap, options);

        res.json({
            success: true,
            data: palette
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get quick color palette (color theory only)
 */
export const getQuickColorPalette = async (req, res, next) => {
    try {
        const { boardSemanticMap, mood } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const palette = await quickColorPalette(boardSemanticMap, mood);

        res.json({
            success: true,
            data: palette
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate palette from a specific color
 */
export const getPaletteFromColor = async (req, res, next) => {
    try {
        const { baseColor, mood } = req.body;
        if (!baseColor) {
            throw new AppError('Base color is required', 400);
        }

        // Validate hex color
        if (!baseColor.match(/^#[0-9A-Fa-f]{6}$/)) {
            throw new AppError('Invalid hex color format. Use #RRGGBB', 400);
        }

        const palette = generatePaletteFromColor(baseColor, mood);

        res.json({
            success: true,
            data: palette
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate story narrative from board
 */
export const generateBoardStory = async (req, res, next) => {
    try {
        const { boardSemanticMap, options } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const story = await storyExplain(boardSemanticMap, options);

        res.json({
            success: true,
            data: story
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get quick story (template-based)
 */
export const getQuickStory = async (req, res, next) => {
    try {
        const { boardSemanticMap, style } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const story = await quickStory(boardSemanticMap, style);

        res.json({
            success: true,
            data: story
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get elevator pitch only
 */
export const getElevatorPitch = async (req, res, next) => {
    try {
        const { boardSemanticMap, style } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const pitch = await elevatorPitch(boardSemanticMap, style);

        res.json({
            success: true,
            data: { pitch }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get detailed narrative only
 */
export const getDetailedNarrative = async (req, res, next) => {
    try {
        const { boardSemanticMap, style } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const narrative = await detailedNarrative(boardSemanticMap, style);

        res.json({
            success: true,
            data: { narrative }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Ask a question about the board
 */
export const askBoardQuestion = async (req, res, next) => {
    try {
        const { question, boardSemanticMap, options } = req.body;
        if (!question || !boardSemanticMap) {
            throw new AppError('Question and board semantic map are required', 400);
        }

        const answer = await askBoard(question, boardSemanticMap, options);

        res.json({
            success: true,
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Ask multiple questions (batch)
 */
export const batchAskBoardQuestions = async (req, res, next) => {
    try {
        const { questions, boardSemanticMap, options } = req.body;
        if (!questions || !Array.isArray(questions) || !boardSemanticMap) {
            throw new AppError('Questions array and board semantic map are required', 400);
        }

        const answers = await batchAskBoard(questions, boardSemanticMap, options);

        res.json({
            success: true,
            data: answers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Quick answer (heuristic only)
 */
export const quickAskBoard = async (req, res, next) => {
    try {
        const { question, boardSemanticMap } = req.body;
        if (!question || !boardSemanticMap) {
            throw new AppError('Question and board semantic map are required', 400);
        }

        const answer = await quickAsk(question, boardSemanticMap);

        res.json({
            success: true,
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get suggested questions for a board
 */
export const getSuggestedQuestions = async (req, res, next) => {
    try {
        const { boardSemanticMap } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const suggestions = suggestQuestions(boardSemanticMap);

        res.json({
            success: true,
            data: { suggestions }
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Generate smart suggestions for board
 */
export const getSmartSuggestions = async (req, res, next) => {
    try {
        const { boardSemanticMap, options } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const suggestions = await generateSmartSuggestions(boardSemanticMap, options);

        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get quick suggestions (heuristic only)
 */
export const getQuickSuggestions = async (req, res, next) => {
    try {
        const { boardSemanticMap } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const suggestions = await quickSuggestions(boardSemanticMap);

        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get high priority suggestions only
 */
export const getHighPrioritySuggestionsOnly = async (req, res, next) => {
    try {
        const { boardSemanticMap } = req.body;
        if (!boardSemanticMap) {
            throw new AppError('Board semantic map is required', 400);
        }

        const suggestions = getHighPrioritySuggestions(boardSemanticMap);

        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        next(error);
    }
};
