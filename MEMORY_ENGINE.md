# Context Memory Engine - AI Memory System

## Overview

The Context Memory Engine is a lightweight, powerful system that stores board history and provides context-aware AI responses. It uses embedding-based semantic search to retrieve the most relevant past information, making AI assistants smarter and more helpful over time.

## Core Capabilities

### 🧠 **Memory Storage**
- Automatic snapshots of board states
- Summaries, decisions, and key moments
- Semantic embeddings for intelligent retrieval
- File-based persistence

### 🔍 **Intelligent Retrieval**
- Embedding-based semantic search
- Keyword fallback for reliability
- Relevance scoring with recency boost
- Top-K retrieval (default: 5 memories)

### 📊 **Memory Types**
- **Snapshots**: Complete board state captures
- **Summaries**: Condensed board overviews
- **Decisions**: Important decision points
- **Questions**: Open questions and discussions
- **Custom**: User-defined memory types

### 🎯 **Context Generation**
- Automatic context from relevant memories
- Formatted for LLM consumption
- Includes timestamps and topics
- Configurable detail level

## Features

### Embedding-Based Search
- Uses Google Gemini embeddings (768 dimensions)
- Cosine similarity for relevance
- Semantic understanding beyond keywords
- Fast and accurate retrieval

### Smart Ranking
- **Primary**: Semantic similarity score
- **Secondary**: Recency (newer = better)
- **Tertiary**: Importance level (high/medium/low)

### Automatic Pruning
- Keeps most recent 100 memories per board
- Prioritizes important memories
- Prevents storage bloat
- Configurable limits

### Optional but Powerful
- Works without API key (keyword search)
- Graceful degradation
- No breaking changes to existing features
- Easy to enable/disable

## API Endpoints

### 1. Store Memory

```http
POST /api/ai/memory/store
Content-Type: application/json

{
  "boardId": "board-123",
  "memoryData": {
    "type": "summary",  // "snapshot" | "summary" | "decision" | "question" | "custom"
    "content": {
      "summary": "User authentication workflow designed",
      "decisions": ["Use OAuth 2.0", "Async payment processing"],
      "questions": ["What if payment gateway is down?"]
    },
    "elementCount": 24,
    "topics": ["authentication", "payment", "security"],
    "importance": "high",  // "high" | "medium" | "low"
    "metadata": {
      "completeness": 85,
      "clarity": 90
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "mem-1702389012345-abc123",
    "boardId": "board-123",
    "timestamp": "2025-12-12T15:48:12.000Z",
    "type": "summary",
    "content": {...},
    "metadata": {...},
    "embedding": [0.123, -0.456, ...] // 768-dim vector
  }
}
```

### 2. Retrieve Memories

```http
POST /api/ai/memory/retrieve
Content-Type: application/json

{
  "boardId": "board-123",
  "query": "How did we decide to handle authentication?",
  "topK": 5  // Optional, default: 5
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "mem-1702389012345-abc123",
      "boardId": "board-123",
      "timestamp": "2025-12-12T15:48:12.000Z",
      "type": "summary",
      "content": {
        "summary": "User authentication workflow designed",
        "decisions": ["Use OAuth 2.0 for authentication"]
      },
      "metadata": {
        "topics": ["authentication", "oauth", "security"],
        "importance": "high"
      }
    }
  ]
}
```

### 3. Generate Context

```http
POST /api/ai/memory/context
Content-Type: application/json

{
  "boardId": "board-123",
  "query": "What payment decisions were made?",
  "topK": 5
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "context": "**Previous Context & Memories:**\n\n1. [2 hours ago] SUMMARY\n   User authentication workflow designed with OAuth 2.0...\n   Topics: authentication, payment, security\n\n2. [1 day ago] DECISION\n   Decided to use asynchronous payment processing...\n   Topics: payment, async, queue\n"
  }
}
```

### 4. Get All Memories

```http
GET /api/ai/memory/:boardId
```

**Response**:
```json
{
  "success": true,
  "data": [
    // Array of all memories for the board
  ]
}
```

### 5. Delete Memory

```http
DELETE /api/ai/memory/:boardId/:memoryId
```

**Response**:
```json
{
  "success": true,
  "message": "Memory deleted"
}
```

### 6. Clear All Memories

```http
DELETE /api/ai/memory/:boardId
```

**Response**:
```json
{
  "success": true,
  "message": "All memories cleared"
}
```

### 7. Get Statistics

```http
GET /api/ai/memory/:boardId/stats
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalMemories": 42,
    "byType": {
      "summary": 15,
      "snapshot": 20,
      "decision": 7
    },
    "byImportance": {
      "high": 10,
      "medium": 25,
      "low": 7
    },
    "oldestMemory": "2025-11-15T10:30:00.000Z",
    "newestMemory": "2025-12-12T15:48:12.000Z",
    "averageTopics": 4.2,
    "hasEmbeddings": 42
  }
}
```

### 8. Auto-Store from Summary

```http
POST /api/ai/memory/auto-store
Content-Type: application/json

{
  "boardId": "board-123",
  "summary": {
    "oneSentenceSummary": "...",
    "keyDecisions": [...],
    "openQuestions": [...],
    "actionableNextSteps": [...],
    "metadata": {
      "totalElements": 24,
      "mainTopics": ["auth", "payment"],
      "completeness": 85
    }
  }
}
```

**Response**: Same as Store Memory

## Usage Examples

### Frontend Integration

```javascript
import { aiService } from './api/aiService';

// Store a memory when board is saved
async function onBoardSave() {
  await aiService.storeMemory('board-123', {
    type: 'snapshot',
    content: {
      summary: 'Added payment flow diagram',
      changes: ['New payment nodes', 'Connected to auth flow']
    },
    elementCount: boardData.nodes.length,
    topics: extractTopics(boardData),
    importance: 'medium'
  });
}

// Retrieve context before AI query
async function askAI(question) {
  // Get relevant memories
  const memories = await aiService.retrieveMemories('board-123', question, 5);
  
  // Generate context
  const context = await aiService.generateContext('board-123', question);
  
  // Send to AI with context
  const response = await aiService.askWithContext(question, context);
  
  return response;
}

// Auto-store after summarization
async function summarizeAndStore() {
  const summary = await aiService.summarizeBoard(boardData);
  
  // Automatically store summary as memory
  await aiService.autoStoreFromSummary('board-123', summary);
  
  return summary;
}

// Get memory statistics for dashboard
async function getMemoryStats() {
  const stats = await aiService.getMemoryStats('board-123');
  
  console.log(`Total memories: ${stats.totalMemories}`);
  console.log(`High importance: ${stats.byImportance.high}`);
}
```

### Backend Usage

```javascript
import { 
  storeMemory, 
  retrieveMemories, 
  generateContext,
  autoStoreFromSummary 
} from './ai/memory.js';

// Store a memory
const memory = await storeMemory('board-123', {
  type: 'decision',
  content: {
    decision: 'Use OAuth 2.0 for authentication',
    rationale: 'Industry standard, better security',
    impact: 'Affects all login flows'
  },
  topics: ['authentication', 'oauth', 'security'],
  importance: 'high'
});

// Retrieve relevant memories
const memories = await retrieveMemories(
  'board-123',
  'How should we handle authentication?',
  5
);

// Generate context for AI
const context = await generateContext(
  'board-123',
  'What payment decisions were made?',
  5
);

// Use context in AI prompt
const prompt = `${context}\n\nUser Question: ${userQuestion}`;
const aiResponse = await llm.generate(prompt);
```

### Context-Aware AI Assistant

```javascript
async function contextAwareAssistant(boardId, userQuery) {
  // Step 1: Retrieve relevant memories
  const memories = await retrieveMemories(boardId, userQuery, 5);
  
  // Step 2: Generate formatted context
  const context = await generateContext(boardId, userQuery, 5);
  
  // Step 3: Build enhanced prompt
  const enhancedPrompt = `
${context}

**Current Board State:**
${getCurrentBoardSummary()}

**User Question:**
${userQuery}

**Instructions:**
Answer the user's question using both the previous context and current board state.
Reference past decisions and discussions when relevant.
`;

  // Step 4: Get AI response
  const response = await llm.generate(enhancedPrompt);
  
  // Step 5: Optionally store this interaction
  await storeMemory(boardId, {
    type: 'question',
    content: {
      question: userQuery,
      answer: response,
      memoriesUsed: memories.length
    },
    topics: extractTopics(userQuery),
    importance: 'medium'
  });
  
  return response;
}
```

## Memory Types Explained

### Snapshot
**Purpose**: Capture complete board state at a moment in time

**When to use**:
- Major milestones
- Before significant changes
- End of work sessions
- Version checkpoints

**Example**:
```javascript
{
  type: 'snapshot',
  content: {
    summary: 'Completed authentication flow design',
    nodeCount: 24,
    edgeCount: 18,
    keyElements: ['Login', 'OAuth', 'Session']
  },
  importance: 'high'
}
```

### Summary
**Purpose**: Condensed overview of board content

**When to use**:
- After summarization
- Regular intervals (daily/weekly)
- Project phase completions

**Example**:
```javascript
{
  type: 'summary',
  content: {
    summary: 'User authentication workflow with OAuth 2.0',
    decisions: ['Use OAuth', 'Async processing'],
    questions: ['What if gateway fails?'],
    nextSteps: ['Implement error handling']
  },
  importance: 'high'
}
```

### Decision
**Purpose**: Record important decisions

**When to use**:
- Key architectural choices
- Technology selections
- Process decisions

**Example**:
```javascript
{
  type: 'decision',
  content: {
    decision: 'Use OAuth 2.0 for authentication',
    rationale: 'Industry standard, better UX',
    impact: 'All login flows',
    alternatives: ['JWT', 'Session-based']
  },
  importance: 'high'
}
```

### Question
**Purpose**: Track open questions and discussions

**When to use**:
- Unresolved issues
- Discussion points
- Future considerations

**Example**:
```javascript
{
  type: 'question',
  content: {
    question: 'What happens if payment gateway is down?',
    context: 'No fallback mechanism defined',
    priority: 'high',
    discussion: ['Consider retry logic', 'Add queue system']
  },
  importance: 'medium'
}
```

## Configuration

### Environment Variables

```env
# Memory storage directory (optional)
MEMORY_DIR=./backend/data/memory

# Gemini API key for embeddings (optional)
GEMINI_API_KEY=your_api_key_here
```

### Constants

```javascript
// In memory.js

const MAX_MEMORIES_PER_BOARD = 100;  // Maximum memories to keep
const EMBEDDING_DIMENSION = 768;      // Gemini embedding size
```

## How It Works

### 1. Storage Flow

```
User Action → Memory Data → Generate Embedding → Store to File → Update Cache
```

### 2. Retrieval Flow

```
Query → Generate Query Embedding → Calculate Similarities → Rank Results → Return Top K
```

### 3. Context Generation Flow

```
Query → Retrieve Memories → Format Context → Return Formatted String
```

### 4. Embedding Process

```
Text Content → Gemini Embedding API → 768-dim Vector → Cosine Similarity Search
```

## Semantic Search Details

### Embedding Generation
- Uses Gemini `embedding-001` model
- 768-dimensional vectors
- Captures semantic meaning
- Fast and accurate

### Similarity Calculation
- Cosine similarity between vectors
- Score range: 0 (unrelated) to 1 (identical)
- Threshold: > 0.5 considered relevant

### Ranking Algorithm
```javascript
// Primary: Semantic similarity
if (scoreDifference > 0.1) {
  return higherScore;
}

// Secondary: Recency
return moreRecent;
```

### Fallback Strategy
If embeddings unavailable:
1. Keyword matching
2. Recency boost
3. Importance boost
4. Combined scoring

## Best Practices

### When to Store Memories

**Do Store**:
- ✅ After major changes
- ✅ Important decisions
- ✅ Completed summaries
- ✅ Key milestones
- ✅ Unresolved questions

**Don't Store**:
- ❌ Every minor edit
- ❌ Temporary states
- ❌ Duplicate information
- ❌ Trivial changes

### Memory Importance Levels

**High**:
- Critical decisions
- Major milestones
- Complete summaries
- Blocking issues

**Medium**:
- Regular updates
- Minor decisions
- Routine questions
- Standard snapshots

**Low**:
- Experimental ideas
- Optional features
- Nice-to-have items

### Optimizing Retrieval

1. **Use Specific Queries**: "How did we decide on authentication?" vs "authentication"
2. **Adjust topK**: Use 3-5 for focused context, 10+ for comprehensive
3. **Include Topics**: Add relevant topics to memories for better matching
4. **Set Importance**: Mark critical memories as "high" importance

### Performance Tips

1. **Enable Embeddings**: Set GEMINI_API_KEY for best results
2. **Limit Memories**: Keep under 100 per board for fast retrieval
3. **Cache Results**: Memory engine caches in-memory
4. **Batch Operations**: Store multiple memories together when possible

## Integration Patterns

### With Board Summarization

```javascript
// After summarizing, auto-store as memory
async function summarizeWithMemory(boardId, boardData) {
  const summary = await summarizeBoard(boardData);
  await autoStoreFromSummary(boardId, summary);
  return summary;
}
```

### With AI Assistant

```javascript
// Context-aware AI responses
async function aiAssistant(boardId, question) {
  const context = await generateContext(boardId, question, 5);
  const prompt = `${context}\n\nQuestion: ${question}`;
  return await llm.generate(prompt);
}
```

### With Validation

```javascript
// Store validation results
async function validateWithMemory(boardId, semanticMap) {
  const validation = await validateDiagram(semanticMap);
  
  if (validation.issueCount > 0) {
    await storeMemory(boardId, {
      type: 'snapshot',
      content: {
        summary: `Validation found ${validation.issueCount} issues`,
        issues: validation.issues,
        score: validation.overallAssessment.score
      },
      importance: validation.summary.criticalIssues > 0 ? 'high' : 'medium'
    });
  }
  
  return validation;
}
```

## Troubleshooting

### Embeddings Not Working
- **Check**: GEMINI_API_KEY is set
- **Verify**: API quota not exceeded
- **Fallback**: System uses keyword search automatically

### Slow Retrieval
- **Cause**: Too many memories
- **Solution**: Clear old memories or increase pruning
- **Optimize**: Use specific queries

### Irrelevant Results
- **Cause**: Poor query or insufficient memories
- **Solution**: Add more context to query
- **Improve**: Store more detailed memories

### Storage Issues
- **Check**: MEMORY_DIR exists and is writable
- **Verify**: Disk space available
- **Clean**: Clear old board memories

## Future Enhancements

Planned features:
- [ ] Vector database integration (Pinecone, Weaviate)
- [ ] Cross-board memory search
- [ ] Memory clustering and categorization
- [ ] Automatic memory importance detection
- [ ] Memory compression for old entries
- [ ] Export/import memory archives
- [ ] Memory analytics and insights
- [ ] Collaborative memory sharing

## Credits

- **Embeddings**: Google Gemini embedding-001
- **Storage**: File-based JSON
- **Search**: Cosine similarity
- **Inspiration**: RAG (Retrieval-Augmented Generation)

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
