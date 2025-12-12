# Layout Advisor - Intelligent Layout Recommendation System

## Overview

The Layout Advisor is an AI-powered system that analyzes board structure and semantics to recommend optimal layout modes. It provides detailed configuration hints for spacing, grouping, alignment, and color coding, making it easy to transform messy boards into professionally organized diagrams.

## Supported Layout Types

### 1. **Grid Layout**
**Best for**: Categorized content, dashboards, galleries

**Characteristics**:
- Organized rows and columns
- Even spacing
- Clear visual hierarchy
- Good for large datasets

**When recommended**:
- Multiple distinct clusters
- High element density
- No clear hierarchy
- 20+ elements

### 2. **Mindmap Layout**
**Best for**: Brainstorming, concept mapping, idea exploration

**Characteristics**:
- Central topic with radiating branches
- Organic, tree-like structure
- Visual emphasis on relationships
- Good for creative thinking

**When recommended**:
- Network structure with multiple connections
- Multiple related topics
- < 50 elements
- Brainstorming sessions

### 3. **Tree Layout**
**Best for**: Org charts, decision trees, hierarchical data

**Characteristics**:
- Top-to-bottom hierarchy
- Clear parent-child relationships
- Multiple levels
- Structured organization

**When recommended**:
- Clear hierarchical structure
- 3+ hierarchy levels
- Parent-child relationships
- Organizational data

### 4. **Radial Layout**
**Best for**: Small hierarchies, visual appeal, presentations

**Characteristics**:
- Circular hierarchy
- Central node with radiating levels
- Visually striking
- Good for small datasets

**When recommended**:
- Shallow hierarchy (< 4 levels)
- < 30 elements
- Presentation purposes
- Visual impact needed

### 5. **Swimlane Layout**
**Best for**: Processes, workflows, multi-actor systems

**Characteristics**:
- Horizontal lanes for phases/actors
- Linear progression
- Clear role separation
- Process-oriented

**When recommended**:
- Phase or stage references
- Linear flow
- Multiple actors/departments
- Process documentation

### 6. **Timeline Layout**
**Best for**: Schedules, roadmaps, historical data

**Characteristics**:
- Chronological left-to-right
- Time-based organization
- Milestone emphasis
- Sequential events

**When recommended**:
- Temporal references (dates, times)
- Linear chronological flow
- < 40 elements
- Project planning

### 7. **Kanban Layout**
**Best for**: Task management, agile workflows, status tracking

**Characteristics**:
- Vertical columns for status
- Card-based organization
- Workflow stages
- Progress visualization

**When recommended**:
- Status references (todo, doing, done)
- Task/ticket management
- 2-6 workflow stages
- Agile methodology

## API Endpoints

### 1. Get Layout Recommendation

```http
POST /api/ai/layout/recommend
Content-Type: application/json

{
  "boardSemanticMap": {
    "nodes": [...],
    "edges": [...],
    "topics": [...],
    "hierarchies": [...],
    "clusters": [...]
  },
  "options": {
    "considerDensity": true,
    "considerSemantics": true,
    "useLLM": true,
    "multipleRecommendations": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-12T15:53:36.000Z",
    "analysis": {
      "nodeCount": 24,
      "edgeCount": 18,
      "density": 0.65,
      "structure": "tree"
    },
    "primary": {
      "type": "tree",
      "score": 85,
      "confidence": 90,
      "reasoning": "Tree layout is recommended because the board has a clear hierarchical structure. With 4 levels, a tree clearly shows the hierarchy.",
      "configuration": {
        "spacing": {
          "horizontal": 150,
          "vertical": 100,
          "levelGap": 120
        },
        "grouping": {
          "enabled": true,
          "method": "hierarchy",
          "siblingGrouping": true
        },
        "alignment": {
          "horizontal": "center",
          "vertical": "top",
          "balanceSubtrees": true
        },
        "colorCoding": {
          "enabled": true,
          "method": "by-level",
          "palette": "gradient",
          "rootColor": "#4F46E5"
        },
        "direction": "top-to-bottom",
        "compactMode": false
      },
      "warnings": []
    },
    "alternatives": [],
    "allScores": {
      "grid": 45,
      "mindmap": 60,
      "tree": 85,
      "radial": 55,
      "swimlane": 30,
      "timeline": 25,
      "kanban": 20
    }
  }
}
```

### 2. Quick Layout Recommendation

```http
POST /api/ai/layout/recommend/quick
Content-Type: application/json

{
  "boardSemanticMap": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Response**: Same structure but without LLM analysis (faster).

### 3. Get Multiple Layout Options

```http
POST /api/ai/layout/options
Content-Type: application/json

{
  "boardSemanticMap": {
    "nodes": [...],
    "edges": [...],
    "topics": [...]
  }
}
```

**Response**: Includes primary + 2 alternative recommendations.

## Configuration Details

### Spacing Configuration

```javascript
{
  horizontal: number,    // Horizontal spacing between elements
  vertical: number,      // Vertical spacing between elements
  padding: number,       // Padding around groups
  levelGap: number,      // Gap between hierarchy levels (tree/radial)
  radialDistance: number // Distance from center (mindmap/radial)
}
```

### Grouping Configuration

```javascript
{
  enabled: boolean,        // Enable grouping
  method: string,          // "cluster"|"topic"|"hierarchy"|"phase"|"status"
  clusterPadding: number,  // Padding around clusters
  maxBranchesPerLevel: number  // Max branches per level (mindmap)
}
```

### Alignment Configuration

```javascript
{
  horizontal: string,      // "left"|"center"|"right"
  vertical: string,        // "top"|"center"|"bottom"
  snapToGrid: boolean,     // Snap elements to grid
  balanceSubtrees: boolean // Balance tree branches
}
```

### Color Coding Configuration

```javascript
{
  enabled: boolean,
  method: string,  // "by-cluster"|"by-type"|"by-level"|"by-branch"|"by-lane"|"by-column"
  palette: string, // "pastel"|"vibrant"|"gradient"|"professional"|"rainbow"|"timeline"|"kanban"
  fadeWithDepth: boolean,  // Fade colors with depth
  alternateRows: boolean   // Alternate row colors
}
```

## Usage Examples

### Frontend Integration

```javascript
import { aiService } from './api/aiService';

// Get layout recommendation
async function getLayoutAdvice() {
  // First, analyze board
  const semanticMap = await aiService.interpretBoard(boardData);
  
  // Get layout recommendation
  const recommendation = await aiService.getLayoutRecommendation(semanticMap);
  
  console.log('Recommended layout:', recommendation.primary.type);
  console.log('Confidence:', recommendation.primary.confidence);
  console.log('Configuration:', recommendation.primary.configuration);
  
  // Apply layout
  await applyLayout(recommendation.primary);
}

// Get multiple options
async function showLayoutOptions() {
  const semanticMap = await aiService.interpretBoard(boardData);
  const options = await aiService.getLayoutOptions(semanticMap);
  
  // Show user primary + alternatives
  const layouts = [options.primary, ...options.alternatives];
  showLayoutPicker(layouts);
}

// Quick recommendation
async function quickLayout() {
  const semanticMap = await aiService.quickAnalyze(boardData);
  const recommendation = await aiService.quickLayoutRecommendation(semanticMap);
  
  // Apply immediately
  applyLayout(recommendation.primary);
}
```

### Backend Usage

```javascript
import { layoutAdvisor, quickLayoutRecommendation, getLayoutOptions } from './ai/layoutAdvisor.js';

// Full recommendation
const recommendation = await layoutAdvisor(semanticMap, {
  considerDensity: true,
  considerSemantics: true,
  useLLM: true,
  multipleRecommendations: false
});

// Quick recommendation
const quick = await quickLayoutRecommendation(semanticMap);

// Multiple options
const options = await getLayoutOptions(semanticMap);
```

### Applying Layout Configuration

```javascript
function applyLayout(recommendation) {
  const { type, configuration } = recommendation;
  
  switch (type) {
    case 'grid':
      applyGridLayout(configuration);
      break;
    case 'tree':
      applyTreeLayout(configuration);
      break;
    case 'mindmap':
      applyMindmapLayout(configuration);
      break;
    // ... other layouts
  }
}

function applyGridLayout(config) {
  const { spacing, grouping, alignment, colorCoding } = config;
  
  // Calculate grid positions
  const columns = config.columns;
  nodes.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    node.position = {
      x: col * spacing.horizontal,
      y: row * spacing.vertical
    };
    
    // Apply color coding
    if (colorCoding.enabled) {
      node.color = getColorForNode(node, colorCoding);
    }
  });
}
```

## Scoring Algorithm

### Heuristic Scoring

Each layout type receives a score (0-100) based on board characteristics:

**Grid Layout**:
- +30 if has clusters
- +20 if high density (>0.5)
- +15 if many elements (>20)
- +20 if no hierarchy

**Tree Layout**:
- +50 if has hierarchy
- +30 if tree structure
- +20 if deep hierarchy (>2 levels)
- -20 if linear flow

**Timeline Layout**:
- +50 if has temporal references
- +30 if linear flow
- +15 if shallow hierarchy
- +5 if moderate size (<40)

### LLM Enhancement

When enabled, Gemini AI:
1. Analyzes board semantics
2. Considers content and context
3. Provides reasoning
4. Suggests alternatives
5. Warns about potential issues

### Final Selection

```javascript
// Primary: LLM recommendation (if confidence > 70%)
if (llmConfidence > 70) {
  return llmRecommendation;
}

// Fallback: Highest heuristic score
return highestScoringLayout;
```

## Color Palettes

### Pastel
Soft, muted colors for professional documents
- `#FFE5E5`, `#E5F3FF`, `#E5FFE5`, `#FFF3E5`

### Vibrant
Bold, energetic colors for creative work
- `#FF6B6B`, `#4ECDC4`, `#45B7D1`, `#FFA07A`

### Gradient
Smooth color transitions by level/depth
- Root: `#4F46E5` → Leaf: `#A78BFA`

### Professional
Corporate-friendly color scheme
- `#1E40AF`, `#059669`, `#DC2626`, `#D97706`

### Rainbow
Full spectrum for maximum distinction
- `#FF0000`, `#FF7F00`, `#FFFF00`, `#00FF00`, `#0000FF`, `#4B0082`, `#9400D3`

### Timeline
Phase-based colors
- Past: `#94A3B8`, Current: `#3B82F6`, Future: `#10B981`

### Kanban
Status-based colors
- Todo: `#94A3B8`, In Progress: `#3B82F6`, Done: `#10B981`

## Best Practices

### When to Request Recommendations

**Do Request**:
- ✅ After major content changes
- ✅ When board feels cluttered
- ✅ Before presentations
- ✅ When onboarding new users
- ✅ After importing data

**Don't Request**:
- ❌ On every minor edit
- ❌ During active editing
- ❌ For very small boards (<5 elements)

### Interpreting Confidence Scores

- **90-100%**: Highly confident, apply immediately
- **70-89%**: Confident, good choice
- **50-69%**: Moderate, consider alternatives
- **<50%**: Low confidence, manual review recommended

### Customizing Configurations

```javascript
// Start with recommendation
const config = recommendation.primary.configuration;

// Adjust spacing for your needs
config.spacing.horizontal *= 1.2; // 20% more space

// Change color palette
config.colorCoding.palette = 'vibrant';

// Apply custom configuration
applyLayout({ type: recommendation.primary.type, configuration: config });
```

## Integration with Auto-Layout Engine

```javascript
async function autoLayoutBoard(boardId) {
  // Step 1: Analyze board
  const semanticMap = await interpretBoard(boardData);
  
  // Step 2: Get layout recommendation
  const recommendation = await layoutAdvisor(semanticMap);
  
  // Step 3: Apply layout with auto-layout engine
  const layoutEngine = new AutoLayoutEngine(recommendation.primary);
  const positioned = await layoutEngine.apply(boardData);
  
  // Step 4: Update board
  await updateBoard(boardId, positioned);
  
  return recommendation;
}
```

## Troubleshooting

### Unexpected Layout Recommendation
- **Check**: Board structure and content
- **Verify**: Semantic map quality
- **Try**: Multiple options to see alternatives

### Low Confidence Scores
- **Cause**: Ambiguous board structure
- **Solution**: Add more elements or clarify relationships
- **Workaround**: Use quick recommendation or manual selection

### Configuration Not Working
- **Check**: Layout type matches configuration
- **Verify**: All required fields present
- **Debug**: Log configuration object

## Future Enhancements

Planned features:
- [ ] Custom layout templates
- [ ] Layout animation/transitions
- [ ] Hybrid layouts (combine multiple types)
- [ ] User preference learning
- [ ] Layout history and undo
- [ ] Collaborative layout voting
- [ ] Export layout as template

## Credits

- **AI Model**: Google Gemini Pro
- **Algorithms**: Graph theory, spatial analysis
- **Inspiration**: Graphviz, D3.js, Mermaid

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
