# Workflow Assistant - AI-Powered Workflow Generation

## Overview

The Workflow Assistant is an advanced AI system that transforms messy board content into polished, professional workflows. It uses Google's Gemini AI combined with sophisticated layout algorithms to generate structured diagrams with proper flow, decision points, and parallel branches.

## Core Capabilities

### 🎯 **Workflow Modes**

1. **Simplify** - Streamline complex workflows
2. **Optimize** - Improve efficiency and structure
3. **Expand** - Add detailed steps and error handling
4. **Convert to Flowchart** - Transform into standard flowchart
5. **Convert to Timeline** - Create chronological timeline view

### 🤖 **AI-Powered Generation**
- Understands context and relationships
- Generates logical flow structures
- Adds missing steps automatically
- Creates proper decision points
- Identifies parallel processes

### 📐 **Auto-Layout**
- **Hierarchical Layout**: Top-to-bottom flow (default)
- **Timeline Layout**: Left-to-right chronological
- Automatic positioning and spacing
- Multi-track support for parallel flows

### 🎨 **Professional Styling**
- Color-coded node types
- Standard flowchart shapes
- Consistent visual hierarchy
- Customizable themes

## Workflow Modes Explained

### 1. Simplify Mode
**Purpose**: Reduce complexity and remove redundancy

**What it does**:
- Removes redundant steps
- Merges similar actions
- Eliminates unnecessary complexity
- Creates linear flow where possible
- Reduces node count by 30-50%

**Best for**:
- Overly complex workflows
- Presentations to stakeholders
- Quick overviews
- Documentation

**Example**:
```
Before: 20 nodes with many redundant steps
After: 10 streamlined nodes with clear flow
```

### 2. Optimize Mode
**Purpose**: Improve efficiency without losing functionality

**What it does**:
- Reorganizes steps for better efficiency
- Removes bottlenecks
- Adds missing critical steps
- Improves decision point clarity
- Adds parallel processing where beneficial

**Best for**:
- Process improvement
- Performance optimization
- Workflow refinement
- Best practices implementation

**Example**:
```
Before: Sequential steps that could run in parallel
After: Parallel branches with proper synchronization
```

### 3. Expand Mode
**Purpose**: Add comprehensive details and edge cases

**What it does**:
- Breaks down high-level steps into sub-steps
- Adds error handling
- Includes validation steps
- Adds decision points for scenarios
- Documents prerequisites and outputs
- Includes alternative paths

**Best for**:
- Detailed documentation
- Training materials
- Implementation guides
- Comprehensive specifications

**Example**:
```
Before: 10 high-level steps
After: 25-30 detailed steps with error handling
```

### 4. Convert to Flowchart Mode
**Purpose**: Create standard flowchart diagram

**What it does**:
- Adds clear start and end points
- Uses standard flowchart symbols:
  - Rectangles for processes
  - Diamonds for decisions
  - Parallelograms for input/output
  - Circles for start/end
- Proper flow arrows
- Swim lanes for multiple actors

**Best for**:
- Formal documentation
- Process mapping
- Standard operating procedures
- Compliance documentation

**Example**:
```
Before: Messy board with mixed elements
After: Clean flowchart with standard symbols
```

### 5. Convert to Timeline Mode
**Purpose**: Show chronological progression

**What it does**:
- Chronological ordering of events
- Time estimates or phases
- Milestones and deliverables
- Dependencies between items
- Parallel tracks for concurrent activities
- Clear start and end dates/phases

**Best for**:
- Project planning
- Historical documentation
- Gantt-style views
- Phase-based processes

**Example**:
```
Before: Unordered process steps
After: Timeline with phases and milestones
```

## API Endpoints

### 1. Generate Workflow (General)

```http
POST /api/ai/workflow/generate
Content-Type: application/json

{
  "input": {
    // Can be raw board data
    "nodes": [...],
    "edges": [...],
    "strokes": [...]
  },
  // OR semantic map from board interpreter
  "options": {
    "mode": "optimize",  // simplify|optimize|expand|convert-to-flowchart|convert-to-timeline
    "style": "professional",  // professional|casual|technical
    "autoLayout": true,
    "preserveContent": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "workflow-xyz",
    "timestamp": "2025-12-12T15:24:39.000Z",
    "mode": "optimize",
    "title": "Optimized User Authentication Workflow",
    "description": "Streamlined authentication process with parallel validation",
    
    "metadata": {
      "estimatedDuration": "5-10 minutes",
      "complexity": "medium",
      "actors": ["User", "System", "Database"],
      "tags": ["authentication", "security", "user-management"]
    },
    
    "nodes": [
      {
        "id": "start-1",
        "type": "start",
        "label": "Start",
        "description": "User initiates login",
        "data": {
          "workflowType": "start",
          "actor": "User"
        },
        "style": {
          "color": "#10b981",
          "shape": "circle",
          "backgroundColor": "#d1fae5",
          "borderColor": "#10b981",
          "borderWidth": 2
        },
        "position": { "x": 0, "y": 0 }
      },
      {
        "id": "process-1",
        "type": "process",
        "label": "Validate Credentials",
        "description": "Check username and password against database",
        "data": {
          "duration": "1-2 seconds",
          "actor": "System",
          "prerequisites": ["User credentials"],
          "outputs": ["Validation result"]
        },
        "style": {
          "color": "#3b82f6",
          "shape": "rectangle",
          "backgroundColor": "#dbeafe",
          "borderColor": "#3b82f6",
          "borderWidth": 2
        },
        "position": { "x": 0, "y": 150 }
      },
      {
        "id": "decision-1",
        "type": "decision",
        "label": "Valid Credentials?",
        "description": "Check if credentials match",
        "data": {
          "actor": "System"
        },
        "style": {
          "color": "#f59e0b",
          "shape": "diamond",
          "backgroundColor": "#fef3c7",
          "borderColor": "#f59e0b",
          "borderWidth": 2
        },
        "position": { "x": 0, "y": 300 }
      }
    ],
    
    "edges": [
      {
        "id": "edge-1",
        "source": "start-1",
        "target": "process-1",
        "label": "",
        "type": "normal",
        "data": {},
        "style": {
          "strokeWidth": 2,
          "stroke": "#64748b",
          "animated": false
        }
      },
      {
        "id": "edge-2",
        "source": "process-1",
        "target": "decision-1",
        "label": "",
        "type": "normal",
        "data": {},
        "style": {
          "strokeWidth": 2,
          "stroke": "#64748b",
          "animated": false
        }
      },
      {
        "id": "edge-3",
        "source": "decision-1",
        "target": "process-2",
        "label": "Yes",
        "type": "conditional",
        "data": {
          "condition": "Credentials are valid"
        },
        "style": {
          "strokeWidth": 2,
          "stroke": "#f59e0b",
          "strokeDasharray": "5,5",
          "animated": false
        }
      }
    ],
    
    "groups": [
      {
        "id": "group-auth",
        "label": "Authentication Phase",
        "nodeIds": ["process-1", "decision-1"],
        "color": "#3b82f6"
      }
    ],
    
    "annotations": [
      {
        "nodeId": "decision-1",
        "text": "Implement rate limiting here to prevent brute force attacks",
        "type": "warning"
      }
    ],
    
    "stats": {
      "nodeCount": 12,
      "edgeCount": 15,
      "decisionPoints": 3,
      "parallelBranches": 2
    },
    
    "layoutMetadata": {
      "type": "hierarchical",
      "bounds": {
        "minX": -200,
        "maxX": 400,
        "minY": 0,
        "maxY": 900
      },
      "appliedAt": "2025-12-12T15:24:39.000Z"
    }
  }
}
```

### 2. Simplify Workflow

```http
POST /api/ai/workflow/simplify
Content-Type: application/json

{
  "boardData": {
    "nodes": [...],
    "edges": [...],
    "strokes": [...]
  }
}
```

### 3. Optimize Workflow

```http
POST /api/ai/workflow/optimize
Content-Type: application/json

{
  "boardData": {
    "nodes": [...],
    "edges": [...]
  }
}
```

### 4. Expand Workflow

```http
POST /api/ai/workflow/expand
Content-Type: application/json

{
  "boardData": {
    "nodes": [...],
    "edges": [...]
  }
}
```

### 5. Convert to Flowchart

```http
POST /api/ai/workflow/convert-to-flowchart
Content-Type: application/json

{
  "boardData": {
    "nodes": [...],
    "edges": [...]
  }
}
```

### 6. Convert to Timeline

```http
POST /api/ai/workflow/convert-to-timeline
Content-Type: application/json

{
  "boardData": {
    "nodes": [...],
    "edges": [...]
  }
}
```

## Node Types

| Type | Shape | Color | Use Case |
|------|-------|-------|----------|
| `start` | Circle | Green | Workflow entry point |
| `end` | Circle | Red | Workflow completion |
| `process` | Rectangle | Blue | Action or task |
| `decision` | Diamond | Orange | Yes/No branching |
| `input` | Parallelogram | Purple | Data input |
| `output` | Parallelogram | Purple | Data output |
| `milestone` | Hexagon | Pink | Important checkpoint |

## Edge Types

| Type | Style | Use Case |
|------|-------|----------|
| `normal` | Solid line | Standard flow |
| `conditional` | Dashed line | Decision branch |
| `parallel` | Thick animated | Concurrent execution |

## Usage Examples

### Frontend Integration

```javascript
import { aiService } from './api/aiService';

// Simplify a complex workflow
async function simplifyCurrentBoard() {
  const boardData = {
    nodes: store.getState().nodes,
    edges: store.getState().edges,
    strokes: store.getState().strokes
  };

  const result = await aiService.simplifyWorkflow(boardData);
  
  // Replace board with simplified workflow
  store.setState({
    nodes: result.nodes,
    edges: result.edges
  });
  
  console.log(`Simplified from ${boardData.nodes.length} to ${result.nodes.length} nodes`);
}

// Convert to flowchart
async function convertToFlowchart() {
  const boardData = getBoardData();
  const flowchart = await aiService.convertToFlowchart(boardData);
  
  applyWorkflowToBoard(flowchart);
}

// Optimize with custom options
async function optimizeWithOptions() {
  const result = await aiService.generateWorkflow(boardData, {
    mode: 'optimize',
    style: 'technical',
    autoLayout: true,
    preserveContent: false
  });
  
  return result;
}
```

### Backend Usage

```javascript
import { 
  generateWorkflow, 
  simplifyWorkflow, 
  optimizeWorkflow,
  convertToFlowchart 
} from './ai/workflowAssistant.js';

// Generate optimized workflow
const workflow = await generateWorkflow(boardData, {
  mode: 'optimize',
  style: 'professional'
});

// Simplify existing workflow
const simplified = await simplifyWorkflow(boardData);

// Convert to timeline
const timeline = await generateWorkflow(boardData, {
  mode: 'convert-to-timeline',
  autoLayout: true
});
```

## Layout Algorithms

### Hierarchical Layout (Default)
**Best for**: Flowcharts, process diagrams, decision trees

**Algorithm**:
1. Find start node (or first node)
2. Build adjacency list from edges
3. BFS traversal to assign levels
4. Calculate positions:
   - Y = level × 150px
   - X = distributed evenly across level width
5. Center each level horizontally

**Parameters**:
- `LEVEL_HEIGHT`: 150px (vertical spacing)
- `NODE_WIDTH`: 200px
- `HORIZONTAL_SPACING`: 100px

### Timeline Layout
**Best for**: Project timelines, chronological processes

**Algorithm**:
1. Topological sort (Kahn's algorithm)
2. Assign to parallel tracks
3. Calculate positions:
   - X = sequence position × 250px
   - Y = track × 150px
4. Align parallel activities

**Parameters**:
- `HORIZONTAL_SPACING`: 250px
- `VERTICAL_SPACING`: 150px
- `TRACK_HEIGHT`: 120px

## Workflow Validation

The system automatically validates:

✅ **Structure**:
- Exactly one start node
- At least one end node
- No orphaned nodes (except start/end)

✅ **Decision Nodes**:
- Minimum 2 outgoing edges
- Clear labels (Yes/No, etc.)

✅ **Connectivity**:
- All nodes reachable from start
- All paths lead to end

✅ **Logic**:
- No unintentional cycles
- Proper flow direction

## Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_api_key_here
```

### Customization Options

```javascript
// In workflowAssistant.js

// Layout spacing
const LEVEL_HEIGHT = 150;
const HORIZONTAL_SPACING = 100;
const NODE_WIDTH = 200;

// Clustering threshold
const CLUSTER_THRESHOLD = 300;

// Node styles
const NODE_STYLES = {
  start: { color: '#10b981', shape: 'circle' },
  process: { color: '#3b82f6', shape: 'rectangle' },
  // ... customize as needed
};
```

## Error Handling

### Fallback Behavior
If Gemini API is unavailable:
- Returns basic linear workflow
- Start → End with minimal nodes
- Includes fallback flag in metadata

### Validation Warnings
Non-critical issues are logged but don't fail:
- Multiple start nodes
- Missing end nodes
- Orphaned nodes
- Decision nodes with <2 outputs

## Best Practices

### Input Preparation
1. **Clean Data**: Remove unnecessary elements before generation
2. **Clear Labels**: Use descriptive node labels
3. **Logical Connections**: Ensure edges make sense
4. **Context**: Provide semantic map for better results

### Mode Selection
- **Simplify**: When presenting to non-technical audience
- **Optimize**: For process improvement projects
- **Expand**: For detailed documentation
- **Flowchart**: For formal process mapping
- **Timeline**: For project planning

### Performance Tips
1. Limit input to <100 nodes for best results
2. Use semantic map input for faster processing
3. Disable auto-layout if custom positioning needed
4. Cache results for unchanged boards

## Integration Patterns

### With Board Interpreter
```javascript
// Analyze first, then generate workflow
const semanticMap = await interpretBoard(boardData);
const workflow = await generateWorkflow(semanticMap, {
  mode: 'optimize'
});

// Use insights for better generation
console.log('Quality before:', semanticMap.insights.qualityScore);
console.log('Issues fixed:', workflow.stats.issuesResolved);
```

### Auto-Improvement Pipeline
```javascript
async function autoImproveBoard(boardData) {
  // Step 1: Analyze
  const analysis = await interpretBoard(boardData);
  
  // Step 2: Generate optimized workflow
  const workflow = await optimizeWorkflow(boardData);
  
  // Step 3: Apply theme
  const themed = await applyTheme(workflow, selectedPalette);
  
  // Step 4: Auto-layout
  const final = await autoLayout(themed);
  
  return final;
}
```

### Batch Processing
```javascript
async function processmultipleBoards(boards) {
  const results = await Promise.all(
    boards.map(board => simplifyWorkflow(board))
  );
  
  return results;
}
```

## Troubleshooting

### Workflow Generation Fails
- **Check API Key**: Ensure GEMINI_API_KEY is set
- **Verify Input**: Validate board data structure
- **Check Quota**: Monitor API usage limits
- **Fallback**: System will use basic generation

### Poor Quality Results
- **Add Context**: Use semantic map instead of raw data
- **Clean Input**: Remove noise from board
- **Try Different Mode**: Experiment with modes
- **Adjust Style**: Change from professional to technical

### Layout Issues
- **Overlapping Nodes**: Increase spacing parameters
- **Too Spread Out**: Decrease spacing parameters
- **Wrong Layout Type**: Use timeline for chronological, hierarchical for flow

## Future Enhancements

Planned features:
- [ ] Custom node type definitions
- [ ] Template-based generation
- [ ] Multi-language support
- [ ] Version comparison
- [ ] Workflow merging
- [ ] Export to BPMN format
- [ ] Real-time collaboration on workflows
- [ ] Workflow simulation/validation
- [ ] Integration with project management tools

## Credits

- **AI Model**: Google Gemini Pro
- **Layout Algorithms**: Graph theory (BFS, topological sort)
- **Flowchart Standards**: ISO 5807
- **Inspiration**: Lucidchart, Miro, Visio

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
