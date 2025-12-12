import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import pptxgen from 'pptxgenjs'; // Assuming pptxgenjs is available or will be installed

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * AI Presenter System
 * 
 * Transforms non-linear whiteboard content into linear presentations (PPTX/PDF).
 * Generates slide content, structure, and speaker notes.
 */

/**
 * Generate a presentation from board content
 */
export async function generatePresentation(boardJSON, options = {}) {
    const {
        style = 'executive', // 'executive', 'technical', 'creative', 'minimal'
        slidesCount = 5,
        format = 'json' // 'json', 'pptx'
    } = options;

    console.log(`Slideshow generating: ${slidesCount} slides, style: ${style}`);

    try {
        // Step 1: Analyze Board & Structure Narrative
        const boardContext = extractBoardContext(boardJSON);
        const narrativeStructure = await generateNarrativeStructure(boardContext, style, slidesCount);

        // Step 2: Generate Slide Content
        const slides = await generateSlideContent(narrativeStructure, boardContext);

        // Step 3: Export Format
        if (format === 'pptx') {
            const pptxBuffer = await exportToPPTX(slides, style);
            return {
                success: true,
                format: 'pptx',
                data: pptxBuffer, // base64 or buffer
                filename: `presentation_${Date.now()}.pptx`
            };
        }

        return {
            success: true,
            format: 'json',
            data: {
                title: narrativeStructure.title,
                style: style,
                slides: slides
            }
        };

    } catch (error) {
        logger.error('Presentation Generation Error:', error);
        throw new Error(`Failed to generate presentation: ${error.message}`);
    }
}

/**
 * Extract relevant context from board JSON
 */
function extractBoardContext(board) {
    const nodes = board.nodes || [];
    // Prioritize text content
    const textNodes = nodes
        .filter(n => n.data?.label || n.data?.text)
        .map(n => ({
            id: n.id,
            text: n.data.label || n.data.text,
            type: n.type
        }))
        .slice(0, 50); // Limit context for token usage

    return JSON.stringify(textNodes);
}

/**
 * Generate high-level narrative structure
 */
async function generateNarrativeStructure(context, style, count) {
    const prompt = `
    Create a ${count}-slide presentation outline based on this whiteboard content.
    Style: ${style} (Tone: ${getToneFromStyle(style)}).
    
    Content:
    ${context}

    Return JSON:
    {
        "title": "Presentation Title",
        "outline": [
            { "title": "Slide 1 Title", "purpose": "Introduction" },
            ...
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

/**
 * Generate detailed content for each slide
 */
async function generateSlideContent(structure, context) {
    const prompt = `
    Generate detailed content for these slides based on the context.
    
    Context: ${context}
    Outline: ${JSON.stringify(structure)}

    For each slide, provide:
    - 3-5 Bullet points
    - A Speaker Note script
    - Visual description (for image generation or layout)

    Return JSON:
    {
        "slides": [
            {
                "title": "Slide Title",
                "bullets": ["Point 1", "Point 2"],
                "notes": "Speaker script...",
                "visual": "A chart showing..."
            }
        ]
    }
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content).slides;
}

/**
 * Export to PPTX using pptxgenjs
 */
async function exportToPPTX(slides, style) {
    try {
        const pres = new pptxgen();
        const theme = getThemeColors(style);

        // Set Metadata
        pres.title = "Flowspace Presentation";

        // Add Slides
        slides.forEach(slideData => {
            const slide = pres.addSlide();

            // Background
            slide.background = { color: theme.bg };

            // Title
            slide.addText(slideData.title, {
                x: 0.5, y: 0.5, w: '90%', h: 1,
                fontSize: 32,
                color: theme.title,
                bold: true,
                align: 'center'
            });

            // Bullets
            slide.addText(slideData.bullets.map(b => `• ${b}`).join('\n'), {
                x: 0.5, y: 1.8, w: '90%', h: 3.5,
                fontSize: 18,
                color: theme.text,
                lineSpacing: 32
            });

            // Notes
            slide.addNotes(slideData.notes);
        });

        // Generate Buffer
        const buffer = await pres.write({ outputType: 'nodebuffer' });
        return buffer.toString('base64');
    } catch (err) {
        console.error("PPTX Generation failed:", err);
        // Fallback to simpler object if library fails
        return null;
    }
}

// Helpers
function getToneFromStyle(style) {
    const tones = {
        executive: 'Professional, concise, business-focused',
        technical: 'Detailed, precise, architectural',
        creative: 'Inspiring, visionary, narrative-driven',
        minimal: 'Clean, simple, direct'
    };
    return tones[style] || 'Professional';
}

function getThemeColors(style) {
    switch (style) {
        case 'creative': return { bg: 'FFF5F5', title: 'DD2C00', text: '333333' };
        case 'technical': return { bg: 'F0F4F8', title: '102A43', text: '243B53' };
        case 'minimal': return { bg: 'FFFFFF', title: '000000', text: '444444' };
        default: return { bg: 'FFFFFF', title: '1A202C', text: '2D3748' };
    }
}

export default { generatePresentation };
