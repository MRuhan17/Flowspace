import { logger } from '../utils/logger.js';

/**
 * Embeddings Store
 * 
 * A lightweight vector database adapter for storing and retrieving semantic embeddings.
 * Currently uses an in-memory store with basic persistence simulation.
 * Can be swapped for Redis Vector, Pinecone, or pgvector.
 */

// In-memory store: { boardId: [ { id, text, vector, metadata } ] }
const vectorDB = new Map();

/**
 * Store or update an embedding
 * @param {string} boardId - The context ID
 * @param {Object} item - { id, text, vector, metadata }
 */
export async function upsert(boardId, item) {
    if (!vectorDB.has(boardId)) {
        vectorDB.set(boardId, []);
    }

    const collection = vectorDB.get(boardId);
    const existingIndex = collection.findIndex(i => i.id === item.id);

    // Validate vector
    if (!item.vector || !Array.isArray(item.vector)) {
        throw new Error('Invalid vector data');
    }

    if (existingIndex >= 0) {
        // Update
        collection[existingIndex] = { ...item, timestamp: Date.now() };
    } else {
        // Insert
        collection.push({ ...item, timestamp: Date.now() });
    }

    logger.debug(`💾 Upserted embedding for board ${boardId}, item ${item.id}`);
    return true;
}

/**
 * Find similar items using Cosine Similarity
 * @param {string} boardId 
 * @param {number[]} queryVector 
 * @param {number} k - Number of results
 * @returns {Promise<Array<{ item, score }>>}
 */
export async function query(boardId, queryVector, k = 5) {
    if (!vectorDB.has(boardId)) {
        return [];
    }

    const collection = vectorDB.get(boardId);

    // Calculate scores
    const scored = collection.map(item => ({
        item,
        score: cosineSimilarity(queryVector, item.vector)
    }));

    // Sort by score descending (high similarity first)
    scored.sort((a, b) => b.score - a.score);

    // Return top k
    return scored.slice(0, k);
}

/**
 * Delete vectors for a specific board (e.g., on board delete)
 */
export async function deleteNamespace(boardId) {
    vectorDB.delete(boardId);
    return true;
}

// --- Math Helpers ---

function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        // Handle dimension mismatch gracefully-ish
        return 0;
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
}

export default { upsert, query, deleteNamespace };
