# Board Interpreter - The Semantic Brain of Flowspace

## Overview

The Board Interpreter is an advanced AI-powered system that acts as the "semantic brain" of Flowspace. It analyzes board content to understand relationships, identify patterns, detect issues, and provide intelligent insights about your visual workspace.

## Core Capabilities

### 🧠 **Semantic Understanding**
- Interprets relationships between shapes, text nodes, flowchart edges, sticky notes, and sketches
- Identifies logical patterns and hierarchies
- Understands context and meaning beyond visual placement

### 🔍 **Pattern Recognition**
- **Spatial Clusters**: Groups nearby elements into logical clusters
- **Topic Extraction**: Identifies main themes and keywords
- **Hierarchies**: Detects flow patterns and organizational structures
- **Dependencies**: Maps cause-and-effect relationships

### ⚠️ **Issue Detection**
- Orphaned nodes (disconnected elements)
- Circular dependencies
- Dead ends (missing next steps)
- Overlapping elements
- Incomplete labels
- Duplicate content

### 💡 **Intelligent Suggestions**
- Actionable recommendations for improvement
- Priority-based suggestions (high/medium/low)
- Context-aware advice
- Quality assessment scoring

## Analysis Modes

### Quick Analysis (Heuristic-Based)
Fast, rule-based analysis using algorithms:
- ⚡ **Speed**: < 1 second
- 🎯 **Focus**: Topics and issues
- 📊 **Method**: Pattern matching and graph algorithms
- 💰 **Cost**: Free (no API calls)

### Deep Analysis (AI-Powered)
Comprehensive analysis using Gemini AI:
- 🤖 **Speed**: 3-8 seconds
- 🎯 **Focus**: Complete semantic understanding
- 📊 **Method**: Heuristics + LLM reasoning
- 💰 **Cost**: Requires Gemini API key

## API Endpoints

### 1. Deep Semantic Interpretation

```http
POST /api/ai/interpret
Content-Type: application/json

{
  "boardJSON": {
    "nodes": [...],
    "edges": [...],
    "strokes": [...],
    "metadata": {}
  },
  "options": {
    "depth": "deep",  // "quick" | "deep"
    "focus": ["all"]  // or ["topics", "issues", "suggestions"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-12T15:19:11.000Z",
    "analysisType": "deep",
    
    "topics": [
      {
        "keyword": "authentication",
        "frequency": 5,
        "elements": ["node-1", "node-3"],
        "avgPosition": { "x": 250, "y": 150 }
      }
    ],
    
    "clusters": [
      {
        "id": "cluster-0",
        "size": 8,
        "density": 0.45,
        "center": { "x": 300, "y": 200 },
        "bounds": { "minX": 100, "maxX": 500, "minY": 50, "maxY": 350 }
      }
    ],
    
    "hierarchies": [
      {
        "root": "node-1",
        "rootText": "Start Process",
        "depth": 4,
        "breadth": 3,
        "levels": [...]
      }
    ],
    
    "dependencies": {
      "chains": [
        {
          "id": "chain-0",
          "length": 5,
          "steps": [
            { "id": "node-1", "text": "Input", "position": {...} },
            { "id": "node-2", "text": "Process", "position": {...} }
          ]
        }
      ],
      "totalConnections": 12,
      "averageChainLength": 3.5
    },
    
    "issues": [
      {
        "type": "orphaned_nodes",
        "severity": "low",
        "count": 3,
        "description": "3 node(s) have no connections",
        "elements": ["node-5", "node-7", "node-9"],
        "suggestion": "Consider connecting these nodes or removing them"
      },
      {
        "type": "circular_dependencies",
        "severity": "medium",
        "count": 1,
        "description": "1 circular dependency path(s) detected",
        "cycles": [["node-2", "node-3", "node-4", "node-2"]],
        "suggestion": "Review these cycles - they may indicate logical issues"
      }
    ],
    
    "duplicates": {
      "exact": [
        {
          "text": "User Login",
          "elements": ["node-3", "node-8"],
          "positions": [...]
        }
      ],
      "similar": [
        {
          "elements": ["node-4", "node-6"],
          "texts": ["Authentication Flow", "Auth Flow"],
          "similarity": 85
        }
      ]
    },
    
    "insights": {
      "mainThemes": ["Authentication", "User Management", "Data Flow"],
      "keyInsights": [
        "The board shows a clear authentication workflow",
        "User management is well-structured with proper hierarchy",
        "Data flow has some circular dependencies that need review"
      ],
      "relationships": [
        {
          "type": "causal",
          "description": "Login triggers authentication which enables user access"
        }
      ],
      "missingElements": [
        "Error handling steps",
        "Logout functionality",
        "Session management"
      ],
      "contradictions": [
        {
          "description": "Two different authentication methods shown without clear selection criteria",
          "elements": ["node-3", "node-7"]
        }
      ],
      "qualityScore": 75,
      "summary": "Well-structured authentication flow with clear hierarchies. Some missing error handling and duplicate elements need attention."
    },
    
    "suggestions": [
      {
        "priority": "high",
        "action": "Add error handling steps after authentication",
        "reason": "Critical path lacks failure scenarios",
        "category": "completeness"
      },
      {
        "priority": "medium",
        "action": "Remove or merge duplicate 'User Login' nodes",
        "reason": "2 identical nodes found",
        "category": "cleanup"
      },
      {
        "priority": "low",
        "action": "Group related elements into clusters",
        "reason": "Elements appear scattered without clear grouping",
        "category": "organization"
      }
    ],
    
    "stats": {
      "nodeCount": 15,
      "edgeCount": 12,
      "strokeCount": 3,
      "totalElements": 30
    }
  }
}
```

### 2. Quick Analysis

```http
POST /api/ai/analyze/quick
Content-Type: application/json

{
  "boardJSON": {
    "nodes": [...],
    "edges": [...],
    "strokes": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-12T15:19:11.000Z",
    "analysisType": "heuristic",
    "topics": [...],
    "issues": [...]
  }
}
```

## Semantic Map Structure

### Topics
Extracted keywords and themes from text content:
```javascript
{
  keyword: string,        // The topic keyword
  frequency: number,      // How many times it appears
  elements: string[],     // IDs of elements containing this topic
  avgPosition: {x, y}     // Average spatial position
}
```

### Clusters
Spatially grouped elements:
```javascript
{
  id: string,            // Cluster identifier
  size: number,          // Number of elements
  density: number,       // Elements per unit area
  center: {x, y},        // Center point
  bounds: {minX, maxX, minY, maxY},  // Bounding box
  elements: object[]     // Array of elements in cluster
}
```

### Hierarchies
Flow and organizational structures:
```javascript
{
  root: string,          // Root node ID
  rootText: string,      // Root node label
  depth: number,         // Number of levels
  breadth: number,       // Maximum width
  levels: array[]        // Elements organized by level
}
```

### Dependencies
Relationship chains and connections:
```javascript
{
  chains: [{
    id: string,
    length: number,
    steps: [{id, text, position}]
  }],
  totalConnections: number,
  averageChainLength: number
}
```

### Issues
Detected problems and warnings:
```javascript
{
  type: string,          // Issue type identifier
  severity: string,      // 'low' | 'medium' | 'high'
  count: number,         // Number of occurrences
  description: string,   // Human-readable description
  elements: string[],    // Affected element IDs
  suggestion: string     // Recommended action
}
```

## Issue Types

| Type | Severity | Description |
|------|----------|-------------|
| `orphaned_nodes` | Low | Nodes with no connections |
| `circular_dependencies` | Medium | Cycles in the flow graph |
| `dead_ends` | Low | Nodes with only incoming connections |
| `overlapping_elements` | Low | Elements too close together |
| `incomplete_labels` | Low | Empty or very short text |

## Usage Examples

### Frontend Integration

```javascript
import { aiService } from './api/aiService';

// Deep analysis
async function analyzeMyBoard() {
  const boardData = {
    nodes: store.getState().nodes,
    edges: store.getState().edges,
    strokes: store.getState().strokes
  };

  const result = await aiService.interpretBoard(boardData, {
    depth: 'deep',
    focus: ['all']
  });

  console.log('Main themes:', result.insights.mainThemes);
  console.log('Issues found:', result.issues.length);
  console.log('Quality score:', result.insights.qualityScore);
  console.log('Suggestions:', result.suggestions);
}

// Quick analysis
async function quickCheck() {
  const boardData = { nodes, edges, strokes };
  const result = await aiService.quickAnalyze(boardData);
  
  console.log('Top topics:', result.topics.slice(0, 5));
  console.log('Issues:', result.issues);
}
```

### Backend Usage

```javascript
import { analyzeBoard, quickAnalyze } from './ai/boardInterpreter.js';

// Deep analysis
const semanticMap = await analyzeBoard(boardJSON, {
  depth: 'deep',
  focus: ['all']
});

// Quick analysis
const quickResults = await quickAnalyze(boardJSON);

// Focused analysis
const topicsOnly = await analyzeBoard(boardJSON, {
  depth: 'quick',
  focus: ['topics', 'clusters']
});
```

## Algorithm Details

### Spatial Clustering
Uses distance-based grouping with configurable threshold (default: 300px):
1. Iterate through all elements
2. Find elements within threshold distance
3. Group into clusters
4. Calculate cluster metrics (size, density, center)

### Topic Extraction
Keyword frequency analysis with stop-word filtering:
1. Extract text from all nodes
2. Tokenize and normalize
3. Filter stop words
4. Count frequencies
5. Rank by occurrence

### Hierarchy Detection
Graph traversal to identify tree structures:
1. Build adjacency lists from edges
2. Find root nodes (no incoming edges)
3. Breadth-first traversal from roots
4. Organize into levels
5. Calculate depth and breadth metrics

### Cycle Detection
Depth-first search with recursion stack:
1. Build directed graph from edges
2. DFS traversal tracking visited nodes
3. Detect back edges (cycles)
4. Extract cycle paths

### Duplicate Detection
Text similarity using Levenshtein distance:
1. Normalize all text (lowercase, trim)
2. Find exact matches
3. Calculate edit distance for similar text
4. Group by similarity threshold (>80%)

## Performance Characteristics

### Quick Analysis
- **Time**: 50-500ms
- **Memory**: ~10MB
- **Scalability**: Handles 1000+ elements
- **Dependencies**: None (pure JavaScript)

### Deep Analysis
- **Time**: 3-8 seconds
- **Memory**: ~20MB
- **Scalability**: Best for <500 elements
- **Dependencies**: Gemini API

### Optimization Tips
1. Use quick analysis for real-time feedback
2. Use deep analysis for comprehensive reports
3. Limit board size for faster processing
4. Cache results when board hasn't changed
5. Use focused analysis for specific insights

## Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_api_key_here
```

### Tunable Parameters

```javascript
// In boardInterpreter.js

// Spatial clustering threshold (pixels)
const CLUSTER_THRESHOLD = 300;

// Minimum text length for analysis
const MIN_TEXT_LENGTH = 3;

// Similarity threshold for duplicates (0-1)
const SIMILARITY_THRESHOLD = 0.8;

// Maximum topics to return
const MAX_TOPICS = 20;
```

## Error Handling

The interpreter gracefully handles errors:

```javascript
try {
  const result = await analyzeBoard(boardJSON);
} catch (error) {
  // Falls back to heuristic-only analysis if LLM fails
  // Returns partial results if some analysis steps fail
  // Logs errors but doesn't crash
}
```

## Best Practices

### When to Use Deep Analysis
- Final board review
- Quality assessment
- Comprehensive reports
- Identifying missing elements
- Finding contradictions

### When to Use Quick Analysis
- Real-time feedback
- Auto-save triggers
- Frequent updates
- Large boards (>200 elements)
- API quota concerns

### Interpreting Results

**Quality Score (0-100)**:
- 90-100: Excellent organization and completeness
- 70-89: Good structure with minor issues
- 50-69: Acceptable but needs improvement
- <50: Significant issues need attention

**Suggestion Priorities**:
- **High**: Critical issues affecting functionality
- **Medium**: Important improvements for clarity
- **Low**: Nice-to-have optimizations

## Integration Examples

### Auto-Analysis on Save
```javascript
// Trigger analysis when board is saved
boardStore.subscribe((state) => {
  if (state.lastSaved > state.lastAnalyzed) {
    quickAnalyze(state.boardData).then(results => {
      if (results.issues.length > 0) {
        showNotification(`Found ${results.issues.length} issues`);
      }
    });
  }
});
```

### Quality Dashboard
```javascript
// Display board quality metrics
async function showQualityDashboard() {
  const analysis = await analyzeBoard(boardData, { depth: 'deep' });
  
  return {
    score: analysis.insights.qualityScore,
    issues: analysis.issues.length,
    suggestions: analysis.suggestions.length,
    completeness: calculateCompleteness(analysis),
    organization: calculateOrganization(analysis)
  };
}
```

### Smart Suggestions Panel
```javascript
// Show contextual suggestions
async function getSmartSuggestions() {
  const analysis = await analyzeBoard(boardData);
  
  return analysis.suggestions
    .filter(s => s.priority === 'high')
    .map(s => ({
      title: s.action,
      description: s.reason,
      action: () => applySuggestion(s)
    }));
}
```

## Future Enhancements

Planned features:
- [ ] Real-time analysis as you edit
- [ ] Custom heuristic rules
- [ ] Machine learning for pattern recognition
- [ ] Collaborative analysis (multi-user insights)
- [ ] Historical trend analysis
- [ ] Export analysis reports
- [ ] Integration with project management tools
- [ ] Natural language queries ("Show me all authentication flows")

## Troubleshooting

### Analysis Takes Too Long
- Use quick analysis instead of deep
- Reduce board size
- Focus analysis on specific aspects
- Check API rate limits

### Low Quality Scores
- Add more descriptive labels
- Connect related elements
- Remove duplicates
- Organize into logical groups
- Add missing steps

### Missing Insights
- Ensure GEMINI_API_KEY is set
- Check API quota
- Verify board has sufficient content
- Use deep analysis mode

## Credits

- **Algorithms**: Graph theory, NLP, spatial analysis
- **AI Model**: Google Gemini Pro
- **Inspiration**: Mind mapping tools, flowchart analyzers, semantic networks

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
