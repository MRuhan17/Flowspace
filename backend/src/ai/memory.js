import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Memory storage configuration
const MEMORY_DIR = process.env.MEMORY_DIR || path.join(__dirname, '../../data/memory');
const MAX_MEMORIES_PER_BOARD = 100;
const EMBEDDING_DIMENSION = 768; // Gemini embedding dimension

/**
 * Context Memory Engine - Lightweight memory system for boards
 * 
 * Stores past summaries, decisions, and semantic snapshots.
 * Retrieves relevant memories using embeddings for context-aware AI responses.
 * 
 * @class MemoryEngine
 */
class MemoryEngine {
    constructor() {
        this.initialized = false;
        this.memoryCache = new Map(); // boardId -> memories[]
        this.embeddingModel = null;
    }

    /**
     * Initialize the memory engine
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Ensure memory directory exists
            await fs.mkdir(MEMORY_DIR, { recursive: true });

            // Initialize embedding model if API key available
            if (process.env.GEMINI_API_KEY) {
                this.embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
            }

            this.initialized = true;
            logger.info('Memory Engine initialized');
        } catch (error) {
            logger.error('Failed to initialize Memory Engine:', error);
            throw error;
        }
    }

    /**
     * Store a memory snapshot for a board
     * 
     * @param {string} boardId - Board identifier
     * @param {object} memoryData - Memory content to store
     * @returns {Promise<object>} Stored memory with metadata
     */
    async storeMemory(boardId, memoryData) {
        await this.initialize();

        const memory = {
            id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            boardId: boardId,
            timestamp: new Date().toISOString(),
            type: memoryData.type || 'snapshot',
            content: memoryData.content,
            metadata: {
                elementCount: memoryData.elementCount || 0,
                topics: memoryData.topics || [],
                importance: memoryData.importance || 'medium',
                ...memoryData.metadata
            },
            embedding: null
        };

        // Generate embedding for semantic search
        if (this.embeddingModel) {
            try {
                memory.embedding = await this.generateEmbedding(memory.content);
            } catch (error) {
                logger.warn('Failed to generate embedding for memory:', error);
            }
        }

        // Store memory
        await this.saveMemoryToFile(boardId, memory);

        // Update cache
        if (!this.memoryCache.has(boardId)) {
            this.memoryCache.set(boardId, []);
        }
        this.memoryCache.get(boardId).push(memory);

        // Limit memories per board
        await this.pruneOldMemories(boardId);

        logger.info(`Memory stored for board ${boardId}: ${memory.id}`);
        return memory;
    }

    /**
     * Retrieve relevant memories for a query
     * 
     * @param {string} boardId - Board identifier
     * @param {string} query - Query text for semantic search
     * @param {number} topK - Number of memories to retrieve (default: 5)
     * @returns {Promise<Array>} Top K most relevant memories
     */
    async retrieveMemories(boardId, query, topK = 5) {
        await this.initialize();

        // Load memories from cache or file
        let memories = this.memoryCache.get(boardId);
        if (!memories) {
            memories = await this.loadMemoriesFromFile(boardId);
            this.memoryCache.set(boardId, memories);
        }

        if (memories.length === 0) {
            return [];
        }

        // If embeddings available, use semantic search
        if (this.embeddingModel && memories.some(m => m.embedding)) {
            return await this.semanticSearch(memories, query, topK);
        }

        // Fallback: keyword-based search + recency
        return this.keywordSearch(memories, query, topK);
    }

    /**
     * Get all memories for a board
     * 
     * @param {string} boardId - Board identifier
     * @returns {Promise<Array>} All memories for the board
     */
    async getAllMemories(boardId) {
        await this.initialize();

        let memories = this.memoryCache.get(boardId);
        if (!memories) {
            memories = await this.loadMemoriesFromFile(boardId);
            this.memoryCache.set(boardId, memories);
        }

        return memories;
    }

    /**
     * Delete a specific memory
     * 
     * @param {string} boardId - Board identifier
     * @param {string} memoryId - Memory identifier
     * @returns {Promise<boolean>} Success status
     */
    async deleteMemory(boardId, memoryId) {
        await this.initialize();

        let memories = this.memoryCache.get(boardId) || await this.loadMemoriesFromFile(boardId);

        const initialLength = memories.length;
        memories = memories.filter(m => m.id !== memoryId);

        if (memories.length < initialLength) {
            this.memoryCache.set(boardId, memories);
            await this.saveAllMemories(boardId, memories);
            logger.info(`Memory deleted: ${memoryId}`);
            return true;
        }

        return false;
    }

    /**
     * Clear all memories for a board
     * 
     * @param {string} boardId - Board identifier
     * @returns {Promise<void>}
     */
    async clearMemories(boardId) {
        await this.initialize();

        this.memoryCache.delete(boardId);

        const filePath = this.getMemoryFilePath(boardId);
        try {
            await fs.unlink(filePath);
            logger.info(`All memories cleared for board ${boardId}`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Failed to clear memories:', error);
            }
        }
    }

    /**
     * Generate context from relevant memories
     * 
     * @param {string} boardId - Board identifier
     * @param {string} query - Current query/task
     * @param {number} topK - Number of memories to include
     * @returns {Promise<string>} Formatted context string
     */
    async generateContext(boardId, query, topK = 5) {
        const memories = await this.retrieveMemories(boardId, query, topK);

        if (memories.length === 0) {
            return '';
        }

        let context = '**Previous Context & Memories:**\n\n';

        memories.forEach((memory, index) => {
            const timeAgo = this.getTimeAgo(new Date(memory.timestamp));
            context += `${index + 1}. [${timeAgo}] ${memory.type.toUpperCase()}\n`;

            if (typeof memory.content === 'string') {
                context += `   ${memory.content.substring(0, 200)}${memory.content.length > 200 ? '...' : ''}\n`;
            } else if (memory.content.summary) {
                context += `   ${memory.content.summary}\n`;
            }

            if (memory.metadata.topics && memory.metadata.topics.length > 0) {
                context += `   Topics: ${memory.metadata.topics.slice(0, 5).join(', ')}\n`;
            }

            context += '\n';
        });

        return context;
    }

    /**
     * Generate embedding for text using Gemini
     * 
     * @param {string|object} content - Content to embed
     * @returns {Promise<Array>} Embedding vector
     */
    async generateEmbedding(content) {
        if (!this.embeddingModel) {
            return null;
        }

        try {
            // Convert content to string if object
            const text = typeof content === 'string'
                ? content
                : JSON.stringify(content).substring(0, 2000); // Limit length

            const result = await this.embeddingModel.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            logger.error('Embedding generation failed:', error);
            return null;
        }
    }

    /**
     * Semantic search using embeddings
     * 
     * @param {Array} memories - Array of memories
     * @param {string} query - Search query
     * @param {number} topK - Number of results
     * @returns {Promise<Array>} Top K memories
     */
    async semanticSearch(memories, query, topK) {
        try {
            // Generate query embedding
            const queryEmbedding = await this.generateEmbedding(query);
            if (!queryEmbedding) {
                return this.keywordSearch(memories, query, topK);
            }

            // Calculate similarity scores
            const scoredMemories = memories
                .filter(m => m.embedding)
                .map(memory => ({
                    memory,
                    score: this.cosineSimilarity(queryEmbedding, memory.embedding)
                }));

            // Sort by score and recency
            scoredMemories.sort((a, b) => {
                // Primary: similarity score
                if (Math.abs(a.score - b.score) > 0.1) {
                    return b.score - a.score;
                }
                // Secondary: recency
                return new Date(b.memory.timestamp) - new Date(a.memory.timestamp);
            });

            return scoredMemories.slice(0, topK).map(sm => sm.memory);
        } catch (error) {
            logger.error('Semantic search failed:', error);
            return this.keywordSearch(memories, query, topK);
        }
    }

    /**
     * Keyword-based search (fallback)
     * 
     * @param {Array} memories - Array of memories
     * @param {string} query - Search query
     * @param {number} topK - Number of results
     * @returns {Array} Top K memories
     */
    keywordSearch(memories, query, topK) {
        const queryWords = query.toLowerCase().split(/\s+/);

        const scoredMemories = memories.map(memory => {
            const contentStr = typeof memory.content === 'string'
                ? memory.content.toLowerCase()
                : JSON.stringify(memory.content).toLowerCase();

            // Calculate keyword match score
            let score = 0;
            queryWords.forEach(word => {
                if (contentStr.includes(word)) {
                    score += 1;
                }
            });

            // Boost recent memories
            const ageInDays = (Date.now() - new Date(memory.timestamp)) / (1000 * 60 * 60 * 24);
            const recencyBoost = Math.max(0, 1 - (ageInDays / 30)); // Decay over 30 days
            score += recencyBoost;

            // Boost important memories
            if (memory.metadata.importance === 'high') {
                score += 0.5;
            }

            return { memory, score };
        });

        scoredMemories.sort((a, b) => b.score - a.score);
        return scoredMemories.slice(0, topK).map(sm => sm.memory);
    }

    /**
     * Calculate cosine similarity between two vectors
     * 
     * @param {Array} vec1 - First vector
     * @param {Array} vec2 - Second vector
     * @returns {number} Similarity score (0-1)
     */
    cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length !== vec2.length) {
            return 0;
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * Save memory to file
     * 
     * @param {string} boardId - Board identifier
     * @param {object} memory - Memory object
     * @returns {Promise<void>}
     */
    async saveMemoryToFile(boardId, memory) {
        const filePath = this.getMemoryFilePath(boardId);

        try {
            let memories = [];
            try {
                const data = await fs.readFile(filePath, 'utf-8');
                memories = JSON.parse(data);
            } catch (error) {
                // File doesn't exist yet
            }

            memories.push(memory);
            await fs.writeFile(filePath, JSON.stringify(memories, null, 2));
        } catch (error) {
            logger.error('Failed to save memory to file:', error);
            throw error;
        }
    }

    /**
     * Save all memories to file
     * 
     * @param {string} boardId - Board identifier
     * @param {Array} memories - Array of memories
     * @returns {Promise<void>}
     */
    async saveAllMemories(boardId, memories) {
        const filePath = this.getMemoryFilePath(boardId);
        await fs.writeFile(filePath, JSON.stringify(memories, null, 2));
    }

    /**
     * Load memories from file
     * 
     * @param {string} boardId - Board identifier
     * @returns {Promise<Array>} Array of memories
     */
    async loadMemoriesFromFile(boardId) {
        const filePath = this.getMemoryFilePath(boardId);

        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            logger.error('Failed to load memories from file:', error);
            return [];
        }
    }

    /**
     * Prune old memories to stay within limit
     * 
     * @param {string} boardId - Board identifier
     * @returns {Promise<void>}
     */
    async pruneOldMemories(boardId) {
        let memories = this.memoryCache.get(boardId) || await this.loadMemoriesFromFile(boardId);

        if (memories.length > MAX_MEMORIES_PER_BOARD) {
            // Keep most recent and most important
            memories.sort((a, b) => {
                // Prioritize importance
                const importanceOrder = { high: 0, medium: 1, low: 2 };
                const importanceDiff = importanceOrder[a.metadata.importance || 'medium'] -
                    importanceOrder[b.metadata.importance || 'medium'];

                if (importanceDiff !== 0) {
                    return importanceDiff;
                }

                // Then by recency
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

            memories = memories.slice(0, MAX_MEMORIES_PER_BOARD);
            this.memoryCache.set(boardId, memories);
            await this.saveAllMemories(boardId, memories);

            logger.info(`Pruned memories for board ${boardId} to ${MAX_MEMORIES_PER_BOARD}`);
        }
    }

    /**
     * Get memory file path
     * 
     * @param {string} boardId - Board identifier
     * @returns {string} File path
     */
    getMemoryFilePath(boardId) {
        const safeId = boardId.replace(/[^a-zA-Z0-9-_]/g, '_');
        return path.join(MEMORY_DIR, `${safeId}.json`);
    }

    /**
     * Get human-readable time ago string
     * 
     * @param {Date} date - Date object
     * @returns {string} Time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }

        return 'just now';
    }

    /**
     * Get memory statistics
     * 
     * @param {string} boardId - Board identifier
     * @returns {Promise<object>} Memory statistics
     */
    async getStatistics(boardId) {
        const memories = await this.getAllMemories(boardId);

        const stats = {
            totalMemories: memories.length,
            byType: {},
            byImportance: { high: 0, medium: 0, low: 0 },
            oldestMemory: null,
            newestMemory: null,
            averageTopics: 0,
            hasEmbeddings: memories.filter(m => m.embedding).length
        };

        if (memories.length === 0) {
            return stats;
        }

        // Count by type
        memories.forEach(memory => {
            stats.byType[memory.type] = (stats.byType[memory.type] || 0) + 1;
            stats.byImportance[memory.metadata.importance || 'medium']++;
        });

        // Find oldest and newest
        const sorted = [...memories].sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        stats.oldestMemory = sorted[0].timestamp;
        stats.newestMemory = sorted[sorted.length - 1].timestamp;

        // Average topics
        const totalTopics = memories.reduce((sum, m) =>
            sum + (m.metadata.topics?.length || 0), 0
        );
        stats.averageTopics = totalTopics / memories.length;

        return stats;
    }
}

// Create singleton instance
const memoryEngine = new MemoryEngine();

/**
 * Store a memory snapshot
 * 
 * @param {string} boardId - Board identifier
 * @param {object} memoryData - Memory content
 * @returns {Promise<object>} Stored memory
 */
export async function storeMemory(boardId, memoryData) {
    return await memoryEngine.storeMemory(boardId, memoryData);
}

/**
 * Retrieve relevant memories
 * 
 * @param {string} boardId - Board identifier
 * @param {string} query - Search query
 * @param {number} topK - Number of memories to retrieve
 * @returns {Promise<Array>} Relevant memories
 */
export async function retrieveMemories(boardId, query, topK = 5) {
    return await memoryEngine.retrieveMemories(boardId, query, topK);
}

/**
 * Generate context from memories
 * 
 * @param {string} boardId - Board identifier
 * @param {string} query - Current query
 * @param {number} topK - Number of memories to include
 * @returns {Promise<string>} Formatted context
 */
export async function generateContext(boardId, query, topK = 5) {
    return await memoryEngine.generateContext(boardId, query, topK);
}

/**
 * Get all memories for a board
 * 
 * @param {string} boardId - Board identifier
 * @returns {Promise<Array>} All memories
 */
export async function getAllMemories(boardId) {
    return await memoryEngine.getAllMemories(boardId);
}

/**
 * Delete a specific memory
 * 
 * @param {string} boardId - Board identifier
 * @param {string} memoryId - Memory identifier
 * @returns {Promise<boolean>} Success status
 */
export async function deleteMemory(boardId, memoryId) {
    return await memoryEngine.deleteMemory(boardId, memoryId);
}

/**
 * Clear all memories for a board
 * 
 * @param {string} boardId - Board identifier
 * @returns {Promise<void>}
 */
export async function clearMemories(boardId) {
    return await memoryEngine.clearMemories(boardId);
}

/**
 * Get memory statistics
 * 
 * @param {string} boardId - Board identifier
 * @returns {Promise<object>} Statistics
 */
export async function getMemoryStatistics(boardId) {
    return await memoryEngine.getStatistics(boardId);
}

/**
 * Auto-store memory from board summary
 * 
 * @param {string} boardId - Board identifier
 * @param {object} summary - Board summary object
 * @returns {Promise<object>} Stored memory
 */
export async function autoStoreFromSummary(boardId, summary) {
    const memoryData = {
        type: 'summary',
        content: {
            summary: summary.oneSentenceSummary,
            decisions: summary.keyDecisions || [],
            questions: summary.openQuestions || [],
            nextSteps: summary.actionableNextSteps || []
        },
        elementCount: summary.metadata?.totalElements || 0,
        topics: summary.metadata?.mainTopics || [],
        importance: summary.metadata?.completeness > 80 ? 'high' : 'medium',
        metadata: {
            completeness: summary.metadata?.completeness,
            clarity: summary.metadata?.clarity
        }
    };

    return await storeMemory(boardId, memoryData);
}

export default memoryEngine;
