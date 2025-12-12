import { logger } from '../utils/logger.js';

/**
 * AI Model Manager
 * 
 * Central hub for routing AI requests to the appropriate model based on feature requirements,
 * cost constraints, and experiment flags. Handles logging, metrics, and dev mode mocking.
 */

// Default configuration mapping features to models
const DEFAULT_CONFIG = {
    // Lightweight tasks
    'summarization': 'gpt-4o-mini',
    'rewrite': 'gpt-4o-mini',
    'chat': 'gpt-4o-mini',

    // Logic-heavy tasks
    'layout': 'gpt-4o',
    'code_gen': 'gpt-4o',
    'validation': 'gpt-4o',

    // Vision tasks
    'vision': 'gpt-4o',

    // Futureproofing / Advanced (Fallback to 4o if 5 not avail)
    'complex_reasoning': 'gpt-4o'
};

// In-memory config store (could be replaced by DB/Redis in production)
let modelConfig = { ...DEFAULT_CONFIG };

// Feature flag for experimental models (e.g. if we want to test a new model on 10% of requests)
const experiments = {
    // 'summarization': { model: 'gpt-4-turbo', probability: 0.1 }
};

/**
 * Get the configured model ID for a specific feature
 * Applies experimental routing logic if active.
 */
export function getModel(feature) {
    // Check for active experiments
    if (experiments[feature]) {
        if (Math.random() < experiments[feature].probability) {
            logger.info(`🧪 Experiment routing: ${feature} -> ${experiments[feature].model}`);
            return experiments[feature].model;
        }
    }

    const model = modelConfig[feature] || 'gpt-4o-mini'; // Default safe fallback
    return model;
}

/**
 * Update the model mapping for a feature at runtime
 */
export function setModel(feature, modelId) {
    if (!feature || !modelId) {
        throw new Error('Feature and ModelID are required');
    }
    logger.info(`⚙️ Config update: ${feature} -> ${modelId}`);
    modelConfig[feature] = modelId;
}

/**
 * Wrapper for AI calls to handle logging, timing, and errors.
 * 
 * @param {string} feature - The feature name (e.g., 'summarization')
 * @param {Function} apiCallFn - Async function performing the actual API call
 * @param {Object} metadata - Context for logging (userId, inputs, etc.)
 */
export async function wrapCall(feature, apiCallFn, metadata = {}) {
    const startTime = Date.now();
    const modelUsed = getModel(feature);
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. Dev Mode / Mocking
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_AI === 'true') {
        logger.info(`[MOCK] ${feature} using ${modelUsed}`);
        await new Promise(r => setTimeout(r, 1000)); // Simulate latency
        return getMockResponse(feature);
    }

    try {
        logger.info(`🚀 [AI Start] ${traceId} | Feature: ${feature} | Model: ${modelUsed}`);

        // 2. Execution
        // We pass the resolved model ID to the function so it knows which to use
        const result = await apiCallFn(modelUsed);

        // 3. Success Telemetry
        const duration = Date.now() - startTime;
        logger.info(`✅ [AI Success] ${traceId} | Duration: ${duration}ms`);

        // Log metrics (In a real app, send to Datadog/Prometheus)
        // metrics.gauge('ai.latency', duration, { feature, model: modelUsed });
        // metrics.increment('ai.success', { feature, model: modelUsed });

        return result;

    } catch (error) {
        // 4. Failure Telemetry
        const duration = Date.now() - startTime;
        logger.error(`❌ [AI Error] ${traceId} | Duration: ${duration}ms | ${error.message}`);

        // metrics.increment('ai.error', { feature, model: modelUsed, error: error.name });

        throw error;
    }
}

/**
 * Returns mock data for local development to save costs
 */
function getMockResponse(feature) {
    const mocks = {
        'summarization': "This is a mocked summary because MOCK_AI=true. The board contains several nodes relating to project planning.",
        'layout': { nodes: [], edges: [] }, // Simplified mock
        'chat': "I am a mock AI assistant. How can I help?",
        'vision': { boxes: [], arrows: [] }
    };
    return mocks[feature] || { result: "Mock response" };
}

export default {
    getModel,
    setModel,
    wrapCall
};
