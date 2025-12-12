# Board Query System - Natural Language Q&A

## Overview

The Board Query System enables natural language questions about whiteboard content. It uses AI reasoning to analyze the semantic map and provide direct answers with references to relevant board elements. Think of it as "ChatGPT for your whiteboard."

## Supported Question Types

### 1. **Missing** ❓
**Questions**: "What's missing?", "What's incomplete?", "What gaps exist?"

**Analyzes**:
- Orphaned nodes
- Dead ends
- Missing connections
- High-priority suggestions

**Example Answer**:
> "There are 3 potential gaps (orphaned nodes or dead ends). High priority suggestions include: Add error handling, Connect authentication flow, Define success criteria."

### 2. **Next Step** ➡️
**Questions**: "What's next?", "What should we do?", "Next steps?"

**Analyzes**:
- High-priority suggestions
- Dead ends needing continuation
- Incomplete flows

**Example Answer**:
> "The next steps should be: 1) Implement user authentication; 2) Add error handling to API calls; 3) Create database schema."

### 3. **Bug/Issue** 🐛
**Questions**: "Is there a bug?", "Any problems?", "What's wrong?"

**Analyzes**:
- High and medium severity issues
- Contradictions
- Circular dependencies

**Example Answer**:
> "Found 2 potential issues: Circular dependency detected between User and Profile modules; Dead end at 'Submit Form' with no error handling."

### 4. **Summary** 📝
**Questions**: "Summarize this", "What is this about?", "Overview?"

**Analyzes**:
- Main themes
- Key insights
- Overall structure

**Example Answer**:
> "This board covers authentication, security, and user management with 24 elements. It outlines a comprehensive user login system with multi-factor authentication and session management."

### 5. **Flow/Process** 🔄
**Questions**: "Explain the flow", "What's the process?", "How does it work?"

**Analyzes**:
- Dependency chains
- Hierarchies
- Sequential steps

**Example Answer**:
> "The main flow has 5 steps: User Login → Validate Credentials → Check 2FA → Create Session → Redirect to Dashboard."

### 6. **Decision** 🤔
**Questions**: "Why was this chosen?", "What's the rationale?", "Why this approach?"

**Analyzes**:
- Insights and reasoning
- Suggestions
- Documented decisions

### 7. **Status** ✅
**Questions**: "What's the status?", "How complete is this?", "Progress?"

**Analyzes**:
- Quality score
- Completeness metrics
- Remaining tasks

### 8. **Comparison** ⚖️
**Questions**: "Compare X and Y", "What's the difference?", "Which is better?"

**Analyzes**:
- Related elements
- Pros and cons
- Recommendations

### 9. **Count** 🔢
**Questions**: "How many?", "Count the elements", "Number of steps?"

**Analyzes**:
- Element counts
- Statistics
- Metrics

### 10. **Location** 📍
**Questions**: "Where is X?", "Find Y", "Locate Z"

**Analyzes**:
- Element positions
- Clusters
- Hierarchies

## API Endpoints

### 1. Ask Question

```http
POST /api/ai/query/ask
Content-Type: application/json

{
  "question": "What's missing from this board?",
  "boardSemanticMap": {
    "topics": [...],
    "issues": [...],
    "suggestions": [...],
    "hierarchies": [...],
    "insights": {...}
  },
  "options": {
    "includeReferences": true,
    "includeConfidence": true,
    "useLLM": true,
    "maxReferences": 5
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-12T16:14:27.000Z",
    "question": "What's missing from this board?",
    "questionType": "missing",
    "answer": "There are 3 potential gaps (orphaned nodes or dead ends). High priority suggestions include: Add error handling, Connect authentication flow, Define success criteria.",
    "reasoning": "Based on orphaned nodes, dead ends, and high-priority suggestions",
    "references": [
      {
        "type": "issue",
        "issueType": "orphaned_nodes",
        "severity": "low",
        "description": "3 node(s) have no connections",
        "elements": ["node-123", "node-456", "node-789"]
      },
      {
        "type": "topic",
        "keyword": "authentication",
        "frequency": 5,
        "elements": ["node-111", "node-222"]
      }
    ],
    "confidence": 0.85,
    "suggestedFollowUps": [
      "What should be added first?",
      "Are there any critical gaps?",
      "How can we fill these gaps?"
    ]
  }
}
```

### 2. Batch Questions

```http
POST /api/ai/query/batch
Content-Type: application/json

{
  "questions": [
    "What's missing?",
    "What's the next step?",
    "Summarize the backend flow"
  ],
  "boardSemanticMap": {...},
  "options": {...}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-12T16:14:27.000Z",
    "totalQuestions": 3,
    "answers": [
      { "question": "What's missing?", "answer": "...", ... },
      { "question": "What's the next step?", "answer": "...", ... },
      { "question": "Summarize the backend flow", "answer": "...", ... }
    ]
  }
}
```

### 3. Quick Answer (Heuristic Only)

```http
POST /api/ai/query/quick
Content-Type: application/json

{
  "question": "How many elements are there?",
  "boardSemanticMap": {...}
}
```

**Response**: Same structure but faster (no LLM, no references, no confidence).

### 4. Get Suggested Questions

```http
POST /api/ai/query/suggestions
Content-Type: application/json

{
  "boardSemanticMap": {...}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "What issues were found?",
      "What's the main flow?",
      "What are the next steps?",
      "What's missing?",
      "Summarize this board",
      "What's the current status?"
    ]
  }
}
```

## Usage Examples

### Frontend Integration

```javascript
import { aiService } from './api/aiService';

// Ask a single question
async function askQuestion(question) {
  const semanticMap = await aiService.interpretBoard(boardData);
  
  const result = await aiService.askBoard(question, semanticMap, {
    includeReferences: true,
    includeConfidence: true,
    useLLM: true
  });
  
  console.log('Question:', result.question);
  console.log('Answer:', result.answer);
  console.log('Confidence:', result.confidence);
  console.log('References:', result.references);
  console.log('Follow-ups:', result.suggestedFollowUps);
  
  displayAnswer(result);
}

// Ask multiple questions
async function askMultiple() {
  const semanticMap = await aiService.interpretBoard(boardData);
  
  const questions = [
    "What's missing?",
    "What's the next step?",
    "Are there any bugs?"
  ];
  
  const results = await aiService.batchAskBoard(questions, semanticMap);
  
  results.answers.forEach(answer => {
    console.log(`Q: ${answer.question}`);
    console.log(`A: ${answer.answer}\n`);
  });
}

// Get suggested questions
async function showSuggestions() {
  const semanticMap = await aiService.interpretBoard(boardData);
  const suggestions = await aiService.getSuggestedQuestions(semanticMap);
  
  // Display as clickable buttons
  suggestions.forEach(question => {
    createQuestionButton(question, () => askQuestion(question));
  });
}

// Quick answer (no AI)
async function quickAnswer(question) {
  const semanticMap = await aiService.quickAnalyze(boardData);
  const result = await aiService.quickAsk(question, semanticMap);
  
  showQuickAnswer(result.answer);
}

// Interactive Q&A interface
function createQAInterface() {
  const input = document.getElementById('question-input');
  const askButton = document.getElementById('ask-button');
  
  askButton.addEventListener('click', async () => {
    const question = input.value;
    if (!question) return;
    
    showLoading();
    const answer = await askQuestion(question);
    hideLoading();
    
    displayAnswer(answer);
    
    // Show follow-up questions
    answer.suggestedFollowUps.forEach(followUp => {
      createFollowUpButton(followUp);
    });
  });
}
```

### Backend Usage

```javascript
import { askBoard, batchAskBoard, quickAsk, suggestQuestions } from './ai/query.js';

// Single question
const answer = await askBoard("What's missing?", semanticMap, {
  includeReferences: true,
  includeConfidence: true,
  useLLM: true,
  maxReferences: 5
});

// Multiple questions
const answers = await batchAskBoard([
  "What's the status?",
  "What's next?",
  "Any bugs?"
], semanticMap);

// Quick answer
const quick = await quickAsk("How many elements?", semanticMap);

// Get suggestions
const suggestions = suggestQuestions(semanticMap);
```

## Question Classification

The system automatically classifies questions into types:

```javascript
{
  missing: /what('s| is)? missing|incomplete|gaps?/,
  nextStep: /next step|what should|follow.?up/,
  bug: /bug|error|issue|problem|wrong/,
  summary: /summarize|overview|explain|describe/,
  flow: /flow|process|workflow|sequence|steps/,
  decision: /why|decision|rationale|reason/,
  status: /status|progress|complete|done/,
  comparison: /compare|difference|versus|vs/,
  count: /how many|count|number of/,
  location: /where|which|locate|find/
}
```

## Answer Structure

### Direct Answer
Clear, concise response to the question (2-3 sentences)

### Reasoning
Explanation of how the answer was derived

### References
Links to relevant board elements:
- **Topics**: Keywords mentioned in answer
- **Issues**: Problems referenced
- **Hierarchies**: Flows or structures cited

### Confidence Score
0.0 - 1.0 rating of answer reliability:
- **0.9-1.0**: Very confident
- **0.7-0.9**: Confident
- **0.5-0.7**: Moderate
- **<0.5**: Low confidence

### Follow-up Questions
Suggested next questions based on the answer

## Best Practices

### Writing Good Questions

**Do**:
- ✅ Be specific: "What's missing from the authentication flow?"
- ✅ Use natural language: "Are there any bugs in the payment system?"
- ✅ Ask one thing at a time: "What's the next step?"

**Don't**:
- ❌ Be vague: "Tell me about this"
- ❌ Ask multiple questions: "What's missing and what's next and are there bugs?"
- ❌ Use unclear references: "What about that thing?"

### When to Use Each Mode

**Full AI Mode** (`useLLM: true`):
- Complex questions
- Need detailed reasoning
- Want high accuracy
- Time is not critical

**Quick Mode** (`useLLM: false`):
- Simple questions (counts, status)
- Need fast response
- Heuristics are sufficient
- Frequent queries

**Batch Mode**:
- Multiple related questions
- Comprehensive analysis
- Report generation
- Automated workflows

## Integration Patterns

### Chat Interface

```javascript
class BoardChatbot {
  constructor(boardId) {
    this.boardId = boardId;
    this.semanticMap = null;
    this.conversationHistory = [];
  }
  
  async initialize() {
    const boardData = await loadBoard(this.boardId);
    this.semanticMap = await interpretBoard(boardData);
  }
  
  async ask(question) {
    const answer = await askBoard(question, this.semanticMap);
    
    this.conversationHistory.push({
      question,
      answer: answer.answer,
      timestamp: new Date()
    });
    
    return answer;
  }
  
  getSuggestions() {
    return suggestQuestions(this.semanticMap);
  }
}

// Usage
const chatbot = new BoardChatbot('board-123');
await chatbot.initialize();

const answer = await chatbot.ask("What's missing?");
console.log(answer.answer);

const suggestions = chatbot.getSuggestions();
console.log('Try asking:', suggestions);
```

### Auto-FAQ Generation

```javascript
async function generateFAQ(boardId) {
  const boardData = await loadBoard(boardId);
  const semanticMap = await interpretBoard(boardData);
  
  const commonQuestions = [
    "What is this board about?",
    "What's the main flow?",
    "What are the next steps?",
    "Are there any issues?",
    "What's the current status?"
  ];
  
  const faq = await batchAskBoard(commonQuestions, semanticMap);
  
  return faq.answers.map(a => ({
    question: a.question,
    answer: a.answer
  }));
}
```

### Smart Search

```javascript
async function smartSearch(searchQuery, boardId) {
  const boardData = await loadBoard(boardId);
  const semanticMap = await interpretBoard(boardData);
  
  // Convert search to question
  const question = `Find information about ${searchQuery}`;
  
  const result = await askBoard(question, semanticMap);
  
  return {
    answer: result.answer,
    relevantElements: result.references.flatMap(r => r.elements || [])
  };
}
```

## Troubleshooting

### Generic Answers
- **Cause**: Insufficient board content or unclear question
- **Solution**: Add more details to board, rephrase question

### Low Confidence
- **Cause**: Ambiguous board structure or complex question
- **Solution**: Simplify question, improve board organization

### Missing References
- **Cause**: Answer doesn't match board elements
- **Solution**: Use more specific terminology in board labels

### Slow Response
- **Cause**: LLM processing time
- **Solution**: Use quick mode or cache common questions

## Future Enhancements

Planned features:
- [ ] Multi-turn conversations with context
- [ ] Voice input/output
- [ ] Question suggestions based on user role
- [ ] Answer caching for common questions
- [ ] Multi-language support
- [ ] Export Q&A as documentation
- [ ] Integration with help systems

## Credits

- **AI Model**: OpenAI GPT-4o-mini
- **Question Classification**: Pattern matching + NLP
- **Inspiration**: ChatGPT, GitHub Copilot, Notion AI

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
