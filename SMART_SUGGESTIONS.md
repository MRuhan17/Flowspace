# Smart Suggestions System - Predictive Recommendations

## Overview

The Smart Suggestions System provides intelligent, predictive recommendations for board improvements. It combines heuristic analysis with AI pattern detection to suggest missing nodes, next steps, alternative flows, shortcuts, and warnings—all ranked by confidence.

## Suggestion Categories

### 1. **Missing Nodes** ❓
**Purpose**: Identify elements that should be added

**Detects**:
- Orphaned nodes needing connections
- Dead ends requiring continuation
- Missing error handling
- Absent documentation
- Lack of validation steps

**Example**:
```json
{
  "type": "error_handling",
  "title": "Add Error Handling",
  "description": "No error handling paths detected. Consider adding error cases and fallbacks.",
  "confidence": 0.65,
  "priority": "medium",
  "suggestedNodes": ["Error Handler", "Fallback", "Retry Logic"]
}
```

### 2. **Next Steps** ➡️
**Purpose**: Recommend immediate actions

**Detects**:
- High-priority action items
- Incomplete workflow chains
- Missing elements from AI analysis
- Quality improvements needed

**Example**:
```json
{
  "type": "completion",
  "title": "Complete Workflow Chains",
  "description": "3 workflow(s) seem incomplete. Add more steps.",
  "confidence": 0.7,
  "priority": "medium",
  "action": "extend"
}
```

### 3. **Alternative Flows** 🔀
**Purpose**: Suggest different approaches

**Detects**:
- Opportunities for parallel processing
- Alternative error paths
- Optimization opportunities
- Redundancy elimination

**Example**:
```json
{
  "type": "parallel",
  "title": "Add Parallel Processing",
  "description": "Linear flow detected. Consider parallel paths for efficiency.",
  "confidence": 0.6,
  "priority": "low",
  "action": "branch"
}
```

### 4. **Shortcuts** ⚡
**Purpose**: Improve productivity

**Detects**:
- Grouping opportunities
- Template creation possibilities
- Keyboard shortcut reminders
- Auto-layout suggestions

**Example**:
```json
{
  "type": "layout",
  "title": "Use Auto-Layout",
  "description": "Dense clusters detected. Auto-layout can improve organization.",
  "confidence": 0.7,
  "priority": "medium",
  "action": "auto_layout"
}
```

### 5. **Warnings** ⚠️
**Purpose**: Alert to potential issues

**Detects**:
- Circular dependencies
- High complexity
- Overlapping elements
- Incomplete labels
- Performance concerns

**Example**:
```json
{
  "type": "circular_dependency",
  "title": "Circular Dependencies Detected",
  "description": "2 circular path(s) found. This may indicate logical issues.",
  "confidence": 0.9,
  "priority": "high",
  "severity": "warning",
  "cycles": [["node1", "node2", "node1"]]
}
```

### 6. **Improvements** ✨
**Purpose**: General quality enhancements

**Detects**:
- Naming consistency issues
- Missing color coding
- Lack of hierarchy
- Insufficient descriptions

**Example**:
```json
{
  "type": "visual",
  "title": "Add Color Coding",
  "description": "Use colors to categorize elements and improve visual hierarchy.",
  "confidence": 0.7,
  "priority": "medium",
  "action": "colorize"
}
```

## API Endpoints

### 1. Generate Smart Suggestions

```http
POST /api/ai/suggestions/generate
Content-Type: application/json

{
  "boardSemanticMap": {
    "topics": [...],
    "issues": [...],
    "hierarchies": [...],
    "dependencies": {...},
    "insights": {...}
  },
  "options": {
    "useLLM": true,
    "includeConfidence": true,
    "maxSuggestionsPerCategory": 5,
    "minConfidence": 0.3
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-12T16:19:34.000Z",
    "totalSuggestions": 12,
    "categories": {
      "missingNodes": [
        {
          "type": "error_handling",
          "title": "Add Error Handling",
          "description": "No error handling paths detected...",
          "confidence": 0.65,
          "priority": "medium",
          "action": "add",
          "suggestedNodes": ["Error Handler", "Fallback"]
        }
      ],
      "nextSteps": [
        {
          "type": "action",
          "title": "Implement User Authentication",
          "description": "High priority action item",
          "confidence": 0.85,
          "priority": "high",
          "action": "implement"
        }
      ],
      "alternativeFlows": [...],
      "shortcuts": [...],
      "warnings": [...],
      "improvements": [...]
    },
    "summary": {
      "total": 12,
      "highPriority": 3,
      "categories": "2 missing nodes, 3 next steps, 1 warnings, 6 improvements",
      "message": "Found 12 suggestion(s) including 3 high priority item(s)."
    }
  }
}
```

### 2. Quick Suggestions (Heuristic Only)

```http
POST /api/ai/suggestions/quick
Content-Type: application/json

{
  "boardSemanticMap": {...}
}
```

**Response**: Same structure but faster (no LLM, max 3 per category).

### 3. High Priority Only

```http
POST /api/ai/suggestions/high-priority
Content-Type: application/json

{
  "boardSemanticMap": {...}
}
```

**Response**: Only high-priority suggestions (max 3 per category).

## Confidence Scoring

### Confidence Levels

**0.9-1.0** - Very High
- Based on clear structural issues
- Example: Circular dependencies detected

**0.7-0.9** - High
- Strong heuristic evidence
- Example: Dead ends found, missing validation

**0.5-0.7** - Medium
- Pattern-based detection
- Example: Naming inconsistency, missing docs

**0.3-0.5** - Low
- Speculative suggestions
- Example: Consider optimization

**<0.3** - Very Low
- Filtered out by default

### Priority Levels

**High** 🔴
- Critical issues
- Blocking problems
- Security concerns

**Medium** 🟡
- Important improvements
- Quality enhancements
- Best practices

**Low** 🟢
- Nice-to-have features
- Minor optimizations
- Cosmetic improvements

## Usage Examples

### Frontend Integration

```javascript
import { aiService } from './api/aiService';

// Get all suggestions
async function getSuggestions() {
  const semanticMap = await aiService.interpretBoard(boardData);
  
  const result = await aiService.getSmartSuggestions(semanticMap, {
    useLLM: true,
    includeConfidence: true,
    maxSuggestionsPerCategory: 5,
    minConfidence: 0.3
  });
  
  console.log('Total:', result.totalSuggestions);
  console.log('High Priority:', result.summary.highPriority);
  
  displaySuggestions(result.categories);
}

// Quick suggestions
async function getQuickSuggestions() {
  const semanticMap = await aiService.quickAnalyze(boardData);
  const result = await aiService.quickSuggestions(semanticMap);
  
  showQuickSuggestions(result.categories);
}

// High priority only
async function getHighPriority() {
  const semanticMap = await aiService.interpretBoard(boardData);
  const result = await aiService.getHighPrioritySuggestions(semanticMap);
  
  showUrgentSuggestions(result.categories);
}

// Display suggestions in UI
function displaySuggestions(categories) {
  Object.entries(categories).forEach(([category, suggestions]) => {
    if (suggestions.length === 0) return;
    
    const section = createSection(category);
    
    suggestions.forEach(suggestion => {
      const card = createSuggestionCard(suggestion);
      section.appendChild(card);
    });
    
    document.getElementById('suggestions-container').appendChild(section);
  });
}

// Create suggestion card
function createSuggestionCard(suggestion) {
  const card = document.createElement('div');
  card.className = `suggestion-card priority-${suggestion.priority}`;
  
  card.innerHTML = `
    <div class="suggestion-header">
      <h3>${suggestion.title}</h3>
      <span class="confidence">${Math.round(suggestion.confidence * 100)}%</span>
    </div>
    <p>${suggestion.description}</p>
    <div class="suggestion-actions">
      <button onclick="applySuggestion('${suggestion.type}')">Apply</button>
      <button onclick="dismissSuggestion('${suggestion.type}')">Dismiss</button>
    </div>
  `;
  
  return card;
}

// Apply suggestion
async function applySuggestion(type) {
  switch (type) {
    case 'error_handling':
      await addErrorHandlingNodes();
      break;
    case 'auto_layout':
      await applyAutoLayout();
      break;
    case 'colorize':
      await applyColorCoding();
      break;
    // ... other cases
  }
  
  showSuccess('Suggestion applied!');
  refreshSuggestions();
}
```

### Backend Usage

```javascript
import { generateSmartSuggestions, quickSuggestions, getHighPrioritySuggestions } from './ai/smartSuggestions.js';

// Full suggestions
const suggestions = await generateSmartSuggestions(semanticMap, {
  useLLM: true,
  includeConfidence: true,
  maxSuggestionsPerCategory: 5,
  minConfidence: 0.3
});

// Quick suggestions
const quick = await quickSuggestions(semanticMap);

// High priority only
const highPriority = getHighPrioritySuggestions(semanticMap);
```

## Heuristic Detection Rules

### Missing Nodes Detection

**Orphaned Nodes**:
```javascript
if (orphanedCount > 0) {
  suggest: "Connect Orphaned Nodes"
  confidence: 0.8
  priority: "medium"
}
```

**Dead Ends**:
```javascript
if (deadEndCount > 0) {
  suggest: "Add Next Steps to Dead Ends"
  confidence: 0.75
  priority: "high"
}
```

**Error Handling**:
```javascript
if (!hasErrorKeywords && hasHierarchies) {
  suggest: "Add Error Handling"
  confidence: 0.65
  priority: "medium"
}
```

### Warning Detection

**Circular Dependencies**:
```javascript
if (circularDependencies > 0) {
  warn: "Circular Dependencies Detected"
  confidence: 0.9
  severity: "warning"
}
```

**High Complexity**:
```javascript
if (totalElements > 100) {
  warn: "Board Complexity High"
  confidence: 0.8
  severity: "info"
}
```

## AI Enhancement

When `useLLM: true`, the system:

1. **Analyzes Patterns**: Detects domain-specific patterns
2. **Adds Context**: Provides contextual recommendations
3. **Suggests Best Practices**: Industry-standard suggestions
4. **Creative Ideas**: Novel improvement ideas

**AI Prompt**:
```
Analyze this whiteboard and enhance the suggestions with AI insights.

Focus on:
1. Pattern-based recommendations
2. Best practice suggestions
3. Domain-specific improvements
4. Creative enhancements
```

## Integration Patterns

### Auto-Suggestion Panel

```javascript
class SuggestionPanel {
  constructor(boardId) {
    this.boardId = boardId;
    this.suggestions = null;
  }
  
  async refresh() {
    const semanticMap = await interpretBoard(this.boardId);
    this.suggestions = await generateSmartSuggestions(semanticMap);
    this.render();
  }
  
  render() {
    const highPriority = this.getHighPriority();
    
    if (highPriority.length > 0) {
      this.showNotification(`${highPriority.length} high priority suggestions`);
    }
    
    this.renderCategories(this.suggestions.categories);
  }
  
  getHighPriority() {
    return Object.values(this.suggestions.categories)
      .flat()
      .filter(s => s.priority === 'high');
  }
}
```

### Periodic Suggestions

```javascript
// Check for suggestions every 5 minutes
setInterval(async () => {
  const semanticMap = await quickAnalyze(boardData);
  const suggestions = await quickSuggestions(semanticMap);
  
  if (suggestions.summary.highPriority > 0) {
    showSuggestionNotification(suggestions);
  }
}, 5 * 60 * 1000);
```

### Smart Notifications

```javascript
async function checkAndNotify() {
  const suggestions = await getHighPrioritySuggestions(semanticMap);
  
  const urgent = Object.values(suggestions.categories)
    .flat()
    .filter(s => s.confidence > 0.8);
  
  if (urgent.length > 0) {
    showUrgentNotification({
      title: 'Important Suggestions',
      message: `${urgent.length} high-confidence suggestions available`,
      actions: ['View', 'Dismiss']
    });
  }
}
```

## Best Practices

### When to Request Suggestions

**Do Request**:
- ✅ After major board changes
- ✅ Before presentations
- ✅ During reviews
- ✅ When board feels incomplete

**Don't Request**:
- ❌ On every minor edit
- ❌ During active editing
- ❌ For very small boards (<5 elements)

### Applying Suggestions

**Review First**:
- Read description carefully
- Check confidence score
- Understand the impact

**Apply Selectively**:
- Start with high-priority items
- Test one at a time
- Verify improvements

**Track Results**:
- Monitor board quality
- Measure improvements
- Adjust based on feedback

## Troubleshooting

### Too Many Suggestions
- **Cause**: Low minimum confidence
- **Solution**: Increase `minConfidence` to 0.5+

### Not Enough Suggestions
- **Cause**: High minimum confidence or small board
- **Solution**: Lower `minConfidence` or add more content

### Irrelevant Suggestions
- **Cause**: Heuristics don't match domain
- **Solution**: Use LLM mode for better context

### Slow Response
- **Cause**: LLM processing
- **Solution**: Use quick mode for faster results

## Future Enhancements

Planned features:
- [ ] Custom suggestion rules
- [ ] Learning from user feedback
- [ ] Domain-specific suggestions
- [ ] Suggestion templates
- [ ] Batch apply suggestions
- [ ] Suggestion history
- [ ] A/B testing suggestions

## Credits

- **AI Model**: OpenAI GPT-4o-mini
- **Heuristics**: Graph theory, pattern matching
- **Inspiration**: GitHub Copilot, IntelliJ IDEA, Grammarly

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
