import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * UX Feedback System
 * 
 * Analyzes board designs for usability, accessibility, and visual hierarchy.
 * Combines deterministic checks (contrast, spacing) with LLM-based heuristic evaluation.
 */

export async function analyzeUX(boardJSON, metadata = {}) {
    console.log('🔍 Analyzing UX/UI of board...');

    const issues = [];
    const scores = { clarity: 0, hierarchy: 0, accessibility: 0 };

    try {
        // 1. Deterministic Checks (Accessibility & Layout)
        const deterministicIssues = runDeterministicChecks(boardJSON);
        issues.push(...deterministicIssues);

        // 2. LLM Heuristic Analysis
        const context = extractDesignContext(boardJSON);
        const heuristics = await evaluateHeuristics(context);

        // Merge results
        issues.push(...heuristics.issues);
        Object.assign(scores, heuristics.scores);

        // 3. Final Scoring Calculation
        // Blend pure math scores with LLM qualitative scores
        scores.accessibility = Math.max(0, 100 - (deterministicIssues.filter(i => i.type === 'accessibility').length * 10));

        return {
            success: true,
            issues: issues,
            scores: scores
        };

    } catch (error) {
        logger.error('UX Analsyis Error:', error);
        throw new Error(`Failed to analyze UX: ${error.message}`);
    }
}

// --- Deterministic Checks ---

function runDeterministicChecks(board) {
    const issues = [];
    const nodes = board.nodes || [];

    nodes.forEach(node => {
        // Check 1: Color Contrast (Simple background vs black/white assumption)
        if (node.style?.backgroundColor) {
            const bg = node.style.backgroundColor;
            const fg = node.style.color || '#000000'; // Default text color
            const ratio = getContrastRatio(bg, fg);

            if (ratio < 4.5) { // WCAG AA for normal text
                issues.push({
                    id: node.id,
                    severity: 'medium',
                    type: 'accessibility',
                    message: `Low contrast ratio (${ratio.toFixed(2)}) detected.`,
                    suggestion: 'Darken the text or lighten the background to improve readability.'
                });
            }
        }

        // Check 2: Missing Labels on Interactive Shapes
        if ((node.type === 'decision' || node.type === 'button') && !node.data?.label) {
            issues.push({
                id: node.id,
                severity: 'high',
                type: 'clarity',
                message: 'Interactive element missing label.',
                suggestion: 'Add a clear text label to this element.'
            });
        }

        // Check 3: Tiny Text
        if (node.style?.fontSize && parseInt(node.style.fontSize) < 12) {
            issues.push({
                id: node.id,
                severity: 'low',
                type: 'accessibility',
                message: 'Text size is too small.',
                suggestion: 'Increase font size to at least 12px.'
            });
        }
    });

    return issues;
}

// --- LLM Heuristics ---

async function evaluateHeuristics(context) {
    const prompt = `
    Analyze this UI/diagram layout for UX best practices.
    
    Nodes Context:
    ${JSON.stringify(context)}

    Evaluate based on:
    1. Information Hierarchy (Is the most important info prominent?)
    2. Grouping/Proximity (Are related items close?)
    3. Clarity (Is the flow logical?)

    Return JSON:
    {
        "scores": { "clarity": 85, "hierarchy": 70 },
        "issues": [
            { "id": "node_id", "severity": "medium", "message": "...", "suggestion": "..." }
        ]
    }
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
}

// Helpers

function extractDesignContext(board) {
    return (board.nodes || []).map(n => ({
        id: n.id,
        type: n.type,
        label: n.data?.label,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        width: n.width,
        height: n.height,
        color: n.style?.backgroundColor
    })).slice(0, 40); // Limit context
}

// Contrast Calculation (Simplified relative luminance)
function getContrastRatio(c1, c2) {
    const lum1 = getLuminance(c1);
    const lum2 = getLuminance(c2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    const a = [rgb.r, rgb.g, rgb.b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    // Simple implementation for standard 6-digit hex
    if (hex.startsWith('#')) hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

export default { analyzeUX };
