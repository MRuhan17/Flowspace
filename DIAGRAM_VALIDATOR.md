# Diagram Validator - Comprehensive Flowchart Validation

## Overview

The Diagram Validator is an intelligent system that analyzes flowcharts and process diagrams to detect structural issues, logical problems, and quality concerns. It provides detailed diagnostics with actionable fixes and AI-powered insights.

## Core Capabilities

### 🔍 **Issue Detection**

**Structural Issues**:
- Dead ends (nodes with no continuation)
- Unreachable steps (isolated from main flow)
- Isolated nodes (no connections)
- Broken connections (invalid references)
- Missing end points

**Logical Issues**:
- Circular logic (unintended cycles)
- Invalid decision nodes (< 2 branches)
- Unlabeled decision branches
- Multiple start nodes
- Logical contradictions

**Quality Issues**:
- Missing labels
- Poor label quality (too short, generic)
- Inconsistent terminology
- Case inconsistencies
- Abbreviation mixing

### 🤖 **AI-Powered Analysis**
- Logical flow validation
- Completeness assessment
- Clarity evaluation
- Best practice checking
- Missing element identification

### 🔧 **Automated Fixes**
- Recommended patches with reasoning
- Auto-applicable fixes
- Priority-based suggestions
- User-guided improvements

## Validation Modes

### Full Validation (Deep)
**Features**:
- Heuristic validation (rule-based)
- Terminology consistency checking
- LLM-powered insights
- Comprehensive patch generation

**Speed**: 3-8 seconds  
**Requires**: Gemini API key (optional)  
**Best for**: Comprehensive quality assessment

### Quick Validation
**Features**:
- Heuristic validation only
- Fast structural checks
- Basic patch suggestions

**Speed**: < 1 second  
**Requires**: None  
**Best for**: Real-time feedback

## API Endpoints

### 1. Full Diagram Validation

```http
POST /api/ai/validate
Content-Type: application/json

{
  "boardSemanticMap": {
    "nodes": [...],
    "edges": [...],
    // Or semantic map from board interpreter
    "topics": [...],
    "hierarchies": [...]
  },
  "options": {
    "strictMode": false,
    "checkTerminology": true,
    "suggestFixes": true,
    "useLLM": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-12T15:33:23.000Z",
    
    "summary": {
      "totalIssues": 12,
      "criticalIssues": 1,
      "highSeverity": 4,
      "mediumSeverity": 5,
      "lowSeverity": 2,
      "patchesAvailable": 15,
      "autoApplicablePatches": 8
    },
    
    "heuristicIssues": {
      "deadEnds": [
        {
          "nodeId": "node-5",
          "label": "Process Payment",
          "severity": "medium",
          "message": "Node \"Process Payment\" has no outgoing connections (dead end)",
          "position": { "x": 300, "y": 450 }
        }
      ],
      
      "missingLabels": [
        {
          "nodeId": "node-3",
          "severity": "high",
          "message": "Node has no label",
          "position": { "x": 150, "y": 200 }
        },
        {
          "nodeId": "node-7",
          "label": "Step 1",
          "severity": "medium",
          "message": "Node has generic label \"Step 1\" - use descriptive text",
          "position": { "x": 400, "y": 300 }
        }
      ],
      
      "circularLogic": [
        {
          "cycle": ["node-2", "node-4", "node-6", "node-2"],
          "cycleLabels": ["Validate", "Process", "Review", "Validate"],
          "severity": "medium",
          "message": "Circular dependency detected: Validate → Process → Review → Validate",
          "isIntentional": false
        }
      ],
      
      "unreachableSteps": [
        {
          "nodeId": "node-9",
          "label": "Send Notification",
          "severity": "high",
          "message": "Node \"Send Notification\" is unreachable from start",
          "position": { "x": 600, "y": 500 }
        }
      ],
      
      "invalidDecisions": [
        {
          "nodeId": "decision-1",
          "label": "Check Status",
          "severity": "high",
          "message": "Decision node \"Check Status\" has fewer than 2 branches (has 1)",
          "position": { "x": 250, "y": 350 }
        },
        {
          "nodeId": "decision-2",
          "label": "Validate Input",
          "severity": "medium",
          "message": "Decision node \"Validate Input\" has 2 unlabeled branch(es)",
          "position": { "x": 200, "y": 250 },
          "unlabeledEdges": ["edge-5", "edge-6"]
        }
      ],
      
      "isolatedNodes": [
        {
          "nodeId": "node-12",
          "label": "Archive Data",
          "severity": "high",
          "message": "Node \"Archive Data\" is completely isolated (no connections)",
          "position": { "x": 700, "y": 600 }
        }
      ],
      
      "multipleStarts": [
        {
          "nodeId": "start-1",
          "label": "Start A",
          "severity": "medium",
          "message": "Multiple start nodes detected",
          "position": { "x": 0, "y": 0 }
        },
        {
          "nodeId": "start-2",
          "label": "Start B",
          "severity": "medium",
          "message": "Multiple start nodes detected",
          "position": { "x": 0, "y": 300 }
        }
      ],
      
      "noEndPoints": [],
      "brokenConnections": []
    },
    
    "terminologyIssues": [
      {
        "type": "case_inconsistency",
        "term": "user",
        "variations": ["User", "user", "USER"],
        "severity": "low",
        "message": "Inconsistent capitalization: User, user, USER",
        "suggestion": "Use consistent capitalization: \"User\""
      },
      {
        "type": "terminology_inconsistency",
        "term": "authenticate",
        "variations": ["authenticate", "auth", "authentication"],
        "severity": "medium",
        "message": "Inconsistent terminology: authenticate, auth, authentication",
        "suggestion": "Standardize to one term: \"authenticate\""
      },
      {
        "type": "abbreviation_inconsistency",
        "terms": ["database", "db"],
        "severity": "low",
        "message": "Mixed use of \"database\" and \"db\"",
        "suggestion": "Use either full term \"database\" or abbreviation \"db\" consistently"
      }
    ],
    
    "llmInsights": {
      "logicalIssues": [
        {
          "type": "missing_logic",
          "description": "Payment processing lacks error handling for failed transactions",
          "affectedNodes": ["node-5", "node-6"],
          "severity": "high",
          "suggestion": "Add a decision node after payment processing to handle success/failure scenarios"
        }
      ],
      
      "missingElements": [
        {
          "type": "missing_validation",
          "description": "No input validation before processing user data",
          "suggestedLocation": "Before 'Process Data' node",
          "severity": "high"
        },
        {
          "type": "missing_step",
          "description": "Missing confirmation step before final submission",
          "suggestedLocation": "Before 'Submit' end node",
          "severity": "medium"
        }
      ],
      
      "clarityIssues": [
        {
          "nodeId": "node-7",
          "currentLabel": "Do stuff",
          "issue": "Vague and unprofessional",
          "suggestedLabel": "Process User Request",
          "reasoning": "More specific and professional terminology"
        }
      ],
      
      "bestPracticeViolations": [
        {
          "practice": "Decision nodes should have clear Yes/No labels",
          "violation": "Decision branches are unlabeled",
          "impact": "Unclear which path represents which outcome",
          "fix": "Add 'Yes'/'No' or 'True'/'False' labels to decision branches"
        }
      ],
      
      "circularLogicAnalysis": [
        {
          "cycle": ["node-2", "node-4", "node-6", "node-2"],
          "isIntentional": false,
          "reasoning": "This appears to be an error rather than an intentional feedback loop. No exit condition is defined.",
          "recommendation": "Break the cycle by adding a decision node with an exit condition"
        }
      ],
      
      "overallAssessment": {
        "score": 62,
        "strengths": [
          "Clear start point",
          "Logical flow structure",
          "Appropriate use of decision nodes"
        ],
        "weaknesses": [
          "Missing error handling",
          "Inconsistent terminology",
          "Some unlabeled elements",
          "Unreachable nodes"
        ],
        "priorityFixes": [
          "Add error handling for payment processing",
          "Label all decision branches",
          "Connect or remove unreachable nodes",
          "Standardize terminology",
          "Add input validation"
        ]
      }
    },
    
    "recommendedPatches": [
      {
        "id": "patch-1",
        "type": "add_end_node",
        "priority": "medium",
        "targetNodeId": "node-5",
        "action": {
          "type": "add_node",
          "nodeType": "end",
          "label": "End",
          "connectFrom": "node-5"
        },
        "reasoning": "Node \"Process Payment\" has no continuation. Adding an end node to properly terminate this path.",
        "autoApplicable": true
      },
      {
        "id": "patch-2",
        "type": "add_label",
        "priority": "high",
        "targetNodeId": "node-3",
        "action": {
          "type": "update_node",
          "property": "label",
          "value": "Unnamed Step"
        },
        "reasoning": "All nodes should have descriptive labels for clarity.",
        "autoApplicable": false,
        "requiresUserInput": true
      },
      {
        "id": "patch-3",
        "type": "label_decision_branches",
        "priority": "medium",
        "targetNodeId": "decision-2",
        "targetEdgeIds": ["edge-5", "edge-6"],
        "action": {
          "type": "update_edges",
          "property": "label",
          "suggestions": ["Yes", "No", "True", "False", "Success", "Failure"]
        },
        "reasoning": "Decision branches should be clearly labeled to show which path is taken under what condition.",
        "autoApplicable": false,
        "requiresUserInput": true
      },
      {
        "id": "patch-4",
        "type": "connect_isolated_node",
        "priority": "high",
        "targetNodeId": "node-12",
        "action": {
          "type": "suggest_connection",
          "message": "Node \"Archive Data\" is isolated. Consider connecting it to the main flow or removing it."
        },
        "reasoning": "Isolated nodes serve no purpose in the workflow and should be connected or removed.",
        "autoApplicable": false
      },
      {
        "id": "patch-5",
        "type": "standardize_terminology",
        "priority": "low",
        "action": {
          "type": "find_and_replace",
          "find": ["User", "user", "USER"],
          "replace": "User"
        },
        "reasoning": "Use consistent capitalization: \"User\"",
        "autoApplicable": true
      },
      {
        "id": "patch-6",
        "type": "add_missing_element",
        "priority": "high",
        "action": {
          "type": "add_node",
          "suggestion": "No input validation before processing user data",
          "location": "Before 'Process Data' node"
        },
        "reasoning": "No input validation before processing user data",
        "autoApplicable": false,
        "llmGenerated": true
      }
    ],
    
    "overallAssessment": {
      "score": 62,
      "strengths": [
        "Clear start point",
        "Logical flow structure"
      ],
      "weaknesses": [
        "Missing error handling",
        "Inconsistent terminology"
      ],
      "priorityFixes": [
        "Add error handling for payment processing",
        "Label all decision branches",
        "Connect or remove unreachable nodes"
      ]
    },
    
    "issueCount": 12
  }
}
```

### 2. Quick Validation

```http
POST /api/ai/validate/quick
Content-Type: application/json

{
  "boardSemanticMap": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Response**: Same structure but without `llmInsights` and with fewer patches.

## Issue Types Reference

### Structural Issues

| Issue Type | Severity | Description | Auto-Fix |
|------------|----------|-------------|----------|
| `deadEnds` | Medium | Nodes with no outgoing connections | ✅ Add end node |
| `unreachableSteps` | High | Nodes not reachable from start | ❌ Manual |
| `isolatedNodes` | High | Nodes with no connections | ❌ Manual |
| `brokenConnections` | Critical | Edges to non-existent nodes | ❌ Manual |
| `multipleStarts` | Medium | More than one start node | ❌ Manual |
| `noEndPoints` | High | No end nodes in diagram | ✅ Add end node |

### Logical Issues

| Issue Type | Severity | Description | Auto-Fix |
|------------|----------|-------------|----------|
| `circularLogic` | Medium/High | Cycles in the flow | ❌ Manual |
| `invalidDecisions` | High | Decision nodes with < 2 branches | ❌ Manual |
| Unlabeled branches | Medium | Decision branches without labels | ❌ Manual |

### Quality Issues

| Issue Type | Severity | Description | Auto-Fix |
|------------|----------|-------------|----------|
| `missingLabels` | High | Empty labels | ❌ Manual |
| Short labels | Low | Labels < 3 characters | ❌ Manual |
| Generic labels | Medium | "Step 1", "Node 2", etc. | ❌ Manual |
| `case_inconsistency` | Low | Mixed capitalization | ✅ Auto-fix |
| `terminology_inconsistency` | Medium | Different terms for same concept | ✅ Auto-fix |
| `abbreviation_inconsistency` | Low | Mixed full/abbreviated terms | ✅ Auto-fix |

## Patch Types

### Auto-Applicable Patches
Can be applied automatically without user input:

- `add_end_node`: Add end node to dead ends
- `standardize_terminology`: Fix terminology inconsistencies
- Case corrections

### User-Guided Patches
Require user input or decision:

- `add_label`: Add descriptive labels
- `connect_isolated_node`: Connect or remove isolated nodes
- `fix_decision_branches`: Add decision branches
- `label_decision_branches`: Label decision outputs
- `add_missing_element`: Add suggested elements

## Usage Examples

### Frontend Integration

```javascript
import { aiService } from './api/aiService';

// Full validation
async function validateCurrentBoard() {
  // First, get semantic map
  const semanticMap = await aiService.interpretBoard(boardData);
  
  // Then validate
  const validation = await aiService.validateDiagram(semanticMap, {
    strictMode: false,
    checkTerminology: true,
    suggestFixes: true,
    useLLM: true
  });
  
  console.log(`Found ${validation.issueCount} issues`);
  console.log(`Health score: ${validation.overallAssessment.score}/100`);
  
  // Show critical issues
  const critical = validation.summary.criticalIssues;
  if (critical > 0) {
    alert(`${critical} critical issues found!`);
  }
  
  // Apply auto-fixes
  const autoPatches = validation.recommendedPatches.filter(p => p.autoApplicable);
  console.log(`${autoPatches.length} fixes can be applied automatically`);
}

// Quick validation for real-time feedback
async function quickCheck() {
  const semanticMap = await aiService.quickAnalyze(boardData);
  const validation = await aiService.quickValidate(semanticMap);
  
  // Show issue count in UI
  updateIssueIndicator(validation.issueCount);
}

// Auto-fix workflow
async function applyAutoFixes() {
  const validation = await aiService.validateDiagram(semanticMap);
  
  const autoPatches = validation.recommendedPatches.filter(p => p.autoApplicable);
  
  for (const patch of autoPatches) {
    await applyPatch(patch);
  }
  
  console.log(`Applied ${autoPatches.length} automatic fixes`);
}
```

### Backend Usage

```javascript
import { validateDiagram, quickValidate } from './ai/diagramValidator.js';

// Full validation
const diagnostics = await validateDiagram(semanticMap, {
  strictMode: true,
  checkTerminology: true,
  suggestFixes: true,
  useLLM: true
});

// Quick validation
const quickDiagnostics = await quickValidate(semanticMap);

// Check specific issue types
if (diagnostics.heuristicIssues.deadEnds.length > 0) {
  console.log('Dead ends found:', diagnostics.heuristicIssues.deadEnds);
}
```

## Validation Workflow

### Recommended Integration

```javascript
async function comprehensiveValidation(boardData) {
  // Step 1: Interpret board
  const semanticMap = await interpretBoard(boardData);
  
  // Step 2: Validate diagram
  const validation = await validateDiagram(semanticMap);
  
  // Step 3: Apply auto-fixes
  const autoPatches = validation.recommendedPatches
    .filter(p => p.autoApplicable);
  
  for (const patch of autoPatches) {
    boardData = applyPatch(boardData, patch);
  }
  
  // Step 4: Show manual fixes to user
  const manualPatches = validation.recommendedPatches
    .filter(p => !p.autoApplicable);
  
  showFixSuggestions(manualPatches);
  
  // Step 5: Re-validate
  const finalValidation = await quickValidate(boardData);
  
  return {
    initialScore: validation.overallAssessment.score,
    finalScore: finalValidation.overallAssessment.score,
    improvement: finalValidation.overallAssessment.score - validation.overallAssessment.score
  };
}
```

## Configuration

### Validation Options

```javascript
{
  strictMode: false,        // Stricter validation rules
  checkTerminology: true,   // Check for terminology consistency
  suggestFixes: true,       // Generate patch recommendations
  useLLM: true             // Use AI for advanced insights
}
```

### Severity Levels

- **Critical**: System-breaking issues (broken connections)
- **High**: Major problems (unreachable nodes, missing labels)
- **Medium**: Important improvements (dead ends, unlabeled branches)
- **Low**: Minor quality issues (case inconsistency)

## Best Practices

### When to Validate

1. **Before Sharing**: Ensure diagram quality before sharing with team
2. **After Major Edits**: Validate after significant changes
3. **Real-time**: Quick validation as users edit
4. **Before Export**: Final check before exporting
5. **Periodic**: Regular validation of large diagrams

### Interpreting Results

**Health Score**:
- 90-100: Excellent - minimal issues
- 70-89: Good - minor improvements needed
- 50-69: Fair - several issues to address
- < 50: Poor - significant problems

**Priority Handling**:
1. Fix critical issues immediately
2. Address high-severity issues
3. Apply auto-fixes
4. Review medium-severity suggestions
5. Consider low-severity improvements

### Performance Tips

1. Use quick validation for real-time feedback
2. Use full validation for comprehensive reports
3. Cache validation results
4. Validate incrementally for large diagrams
5. Batch auto-fixes for efficiency

## Troubleshooting

### Validation Fails
- **Check Input**: Ensure semantic map is valid
- **API Key**: Verify GEMINI_API_KEY for LLM features
- **Data Structure**: Validate nodes and edges format

### Too Many Issues
- **Start with Critical**: Fix critical issues first
- **Auto-Fix**: Apply automatic patches
- **Incremental**: Fix issues gradually
- **Simplify**: Consider simplifying complex diagrams

### False Positives
- **Review Context**: Some "issues" may be intentional
- **Adjust Strictness**: Disable strict mode
- **Ignore Low Severity**: Focus on high-priority issues

## Future Enhancements

Planned features:
- [ ] Custom validation rules
- [ ] Domain-specific validators (BPMN, UML, etc.)
- [ ] Batch validation for multiple diagrams
- [ ] Validation history and trends
- [ ] Integration with version control
- [ ] Automated fix application
- [ ] Validation templates
- [ ] Compliance checking

## Credits

- **Algorithms**: Graph theory, NLP, pattern matching
- **AI Model**: Google Gemini Pro
- **Standards**: Flowchart best practices, ISO 5807

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Author**: Flowspace Development Team  
**License**: Same as Flowspace project
