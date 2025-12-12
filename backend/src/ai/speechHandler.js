import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Speech Handler - Audio Transcription and Command Classification
 * 
 * Handles audio chunks or base64 audio, transcribes using Whisper,
 * and classifies commands using LLM with confidence scores.
 */

/**
 * Process speech input and extract commands
 */
export async function processSpeech(audioData, options = {}) {
    const {
        format = 'buffer', // 'buffer' | 'base64' | 'file'
        useLLM = true,
        includeConfidence = true
    } = options;

    console.log('🎤 Processing speech input...');

    try {
        // Step 1: Transcribe audio
        const transcript = await transcribeAudio(audioData, format);

        if (!transcript || !transcript.text) {
            throw new Error('Transcription failed');
        }

        console.log('Transcript:', transcript.text);

        // Step 2: Extract commands
        let commands;
        if (useLLM && process.env.OPENAI_API_KEY) {
            commands = await extractCommandsWithLLM(transcript.text, includeConfidence);
        } else {
            commands = extractCommandsWithPunctuation(transcript.text);
        }

        console.log(`✅ Extracted ${commands.length} command(s)`);

        return {
            success: true,
            transcript: transcript.text,
            duration: transcript.duration,
            commands,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error('Speech Processing Error:', error);
        return {
            success: false,
            error: error.message,
            transcript: '',
            commands: []
        };
    }
}

/**
 * Transcribe audio using Whisper
 */
async function transcribeAudio(audioData, format) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

    let filePath;
    let shouldCleanup = false;

    try {
        // Convert to file if needed
        if (format === 'buffer') {
            filePath = path.join('/tmp', `audio-${Date.now()}.webm`);
            fs.writeFileSync(filePath, audioData);
            shouldCleanup = true;
        } else if (format === 'base64') {
            const buffer = Buffer.from(audioData, 'base64');
            filePath = path.join('/tmp', `audio-${Date.now()}.webm`);
            fs.writeFileSync(filePath, buffer);
            shouldCleanup = true;
        } else if (format === 'file') {
            filePath = audioData;
        }

        // Create read stream
        const audioFile = fs.createReadStream(filePath);

        // Call Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
            response_format: 'verbose_json',
            temperature: 0.2
        });

        // Clean up temporary file
        if (shouldCleanup && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return {
            text: transcription.text,
            duration: transcription.duration,
            language: transcription.language
        };

    } catch (error) {
        // Clean up on error
        if (shouldCleanup && filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw error;
    }
}

/**
 * Extract commands using LLM
 */
async function extractCommandsWithLLM(transcript, includeConfidence) {
    const prompt = buildCommandExtractionPrompt(transcript);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at parsing voice commands for a whiteboard application. Extract structured commands from natural language. Always return valid JSON.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);

        // Validate and format commands
        const commands = (result.commands || []).map(cmd => ({
            type: cmd.type || 'unknown',
            payload: cmd.payload || {},
            confidence: includeConfidence ? (cmd.confidence || 0.8) : undefined,
            originalText: cmd.originalText || transcript
        }));

        return commands;

    } catch (error) {
        logger.error('LLM Command Extraction Error:', error);
        // Fallback to punctuation-based extraction
        return extractCommandsWithPunctuation(transcript);
    }
}

/**
 * Build command extraction prompt
 */
function buildCommandExtractionPrompt(transcript) {
    return `Parse this voice command transcript and extract structured commands for a whiteboard application.

**Transcript:**
"${transcript}"

**Available Command Types:**
1. **add_sticky** - Create sticky note
   - Payload: { text: string, x?: number, y?: number, color?: string }
   
2. **add_node** - Create node
   - Payload: { text: string, type?: string, x?: number, y?: number }
   
3. **add_connection** - Create connection
   - Payload: { from?: string, to?: string, label?: string }
   
4. **select** - Select elements
   - Payload: { filter: "all" | "none" | string }
   
5. **delete** - Delete elements
   - Payload: { targets: "selected" | "all" }
   
6. **align** - Align elements
   - Payload: { direction: "left" | "right" | "top" | "bottom" | "center" }
   
7. **distribute** - Distribute elements
   - Payload: { direction: "horizontal" | "vertical" }
   
8. **group** - Group elements
   - Payload: { targets: "selected" | string }
   
9. **ungroup** - Ungroup elements
   - Payload: { targets: "selected" | "all" }
   
10. **style** - Change style
    - Payload: { property: "color" | "size", value: string }
    
11. **layout** - Apply layout
    - Payload: { algorithm: "grid" | "tree" | "circle" | "force" }
    
12. **zoom** - Zoom control
    - Payload: { direction: "in" | "out" | "fit" }
    
13. **undo** - Undo action
    - Payload: {}
    
14. **redo** - Redo action
    - Payload: {}
    
15. **save** - Save board
    - Payload: {}

**Your Task:**
Extract all commands from the transcript. For each command:
- Identify the command type
- Extract relevant parameters for the payload
- Assign a confidence score (0.0-1.0)
- Include the original text that triggered this command

**Output Format (JSON only):**
{
  "commands": [
    {
      "type": "command_type",
      "payload": { "param": "value" },
      "confidence": 0.95,
      "originalText": "relevant part of transcript"
    }
  ]
}

**Examples:**

Input: "insert sticky note saying hello world"
Output: {
  "commands": [{
    "type": "add_sticky",
    "payload": { "text": "hello world" },
    "confidence": 0.95,
    "originalText": "insert sticky note saying hello world"
  }]
}

Input: "undo and then select all"
Output: {
  "commands": [
    {
      "type": "undo",
      "payload": {},
      "confidence": 1.0,
      "originalText": "undo"
    },
    {
      "type": "select",
      "payload": { "filter": "all" },
      "confidence": 1.0,
      "originalText": "select all"
    }
  ]
}

Return ONLY valid JSON. If no commands found, return { "commands": [] }.`;
}

/**
 * Extract commands using punctuation (fallback)
 */
function extractCommandsWithPunctuation(transcript) {
    // Split by common separators
    const segments = transcript
        .split(/[.,;]|\s+and\s+|\s+then\s+/i)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const commands = [];

    segments.forEach(segment => {
        const command = parseSimpleCommand(segment);
        if (command) {
            commands.push(command);
        }
    });

    return commands;
}

/**
 * Parse simple command using pattern matching
 */
function parseSimpleCommand(text) {
    const lowerText = text.toLowerCase().trim();

    // Command patterns
    const patterns = [
        {
            regex: /(?:insert|add|create)\s+(?:a\s+)?sticky(?:\s+note)?(?:\s+(?:saying|with|that says))?\s+(.+)/i,
            handler: (match) => ({
                type: 'add_sticky',
                payload: { text: match[1] },
                confidence: 0.8,
                originalText: text
            })
        },
        {
            regex: /(?:insert|add|create)\s+(?:a\s+)?node(?:\s+(?:saying|with|labeled))?\s+(.+)/i,
            handler: (match) => ({
                type: 'add_node',
                payload: { text: match[1] },
                confidence: 0.8,
                originalText: text
            })
        },
        {
            regex: /^undo$/i,
            handler: () => ({
                type: 'undo',
                payload: {},
                confidence: 1.0,
                originalText: text
            })
        },
        {
            regex: /^redo$/i,
            handler: () => ({
                type: 'redo',
                payload: {},
                confidence: 1.0,
                originalText: text
            })
        },
        {
            regex: /(?:auto\s+)?layout|organize|arrange/i,
            handler: () => ({
                type: 'layout',
                payload: { algorithm: 'grid' },
                confidence: 0.7,
                originalText: text
            })
        },
        {
            regex: /select\s+(all|everything)/i,
            handler: () => ({
                type: 'select',
                payload: { filter: 'all' },
                confidence: 0.9,
                originalText: text
            })
        },
        {
            regex: /(?:clear|deselect)\s+(?:selection|all)/i,
            handler: () => ({
                type: 'select',
                payload: { filter: 'none' },
                confidence: 0.9,
                originalText: text
            })
        },
        {
            regex: /delete\s+(?:selected|selection)/i,
            handler: () => ({
                type: 'delete',
                payload: { targets: 'selected' },
                confidence: 0.9,
                originalText: text
            })
        },
        {
            regex: /align\s+(?:to\s+)?(?:the\s+)?(left|right|top|bottom|center)/i,
            handler: (match) => ({
                type: 'align',
                payload: { direction: match[1] },
                confidence: 0.85,
                originalText: text
            })
        },
        {
            regex: /distribute\s+(horizontally|vertically)/i,
            handler: (match) => ({
                type: 'distribute',
                payload: { direction: match[1] === 'horizontally' ? 'horizontal' : 'vertical' },
                confidence: 0.85,
                originalText: text
            })
        },
        {
            regex: /group\s+(?:selected|selection)/i,
            handler: () => ({
                type: 'group',
                payload: { targets: 'selected' },
                confidence: 0.9,
                originalText: text
            })
        },
        {
            regex: /ungroup\s+(?:selected|selection|all)/i,
            handler: (match) => ({
                type: 'ungroup',
                payload: { targets: match[1] || 'selected' },
                confidence: 0.9,
                originalText: text
            })
        },
        {
            regex: /(?:make|change|set)\s+(?:color\s+)?(?:to\s+)?(red|blue|green|yellow|purple|orange|pink|gray)/i,
            handler: (match) => ({
                type: 'style',
                payload: { property: 'color', value: match[1] },
                confidence: 0.8,
                originalText: text
            })
        },
        {
            regex: /zoom\s+(in|out)/i,
            handler: (match) => ({
                type: 'zoom',
                payload: { direction: match[1] },
                confidence: 0.9,
                originalText: text
            })
        },
        {
            regex: /save|export/i,
            handler: () => ({
                type: 'save',
                payload: {},
                confidence: 0.7,
                originalText: text
            })
        }
    ];

    // Try to match patterns
    for (const pattern of patterns) {
        const match = lowerText.match(pattern.regex);
        if (match) {
            return pattern.handler(match);
        }
    }

    return null;
}

/**
 * Process audio stream chunk
 */
export async function processStreamChunk(chunk, streamState = {}) {
    // Accumulate chunks
    if (!streamState.chunks) {
        streamState.chunks = [];
    }
    streamState.chunks.push(chunk);

    // Check if we have enough data (e.g., 1 second worth)
    const totalSize = streamState.chunks.reduce((sum, c) => sum + c.length, 0);

    if (totalSize >= 16000) { // Approximately 1 second at 16kHz
        // Combine chunks
        const combinedBuffer = Buffer.concat(streamState.chunks);
        streamState.chunks = [];

        // Process the accumulated audio
        const result = await processSpeech(combinedBuffer, {
            format: 'buffer',
            useLLM: true,
            includeConfidence: true
        });

        return result;
    }

    return null; // Not enough data yet
}

/**
 * Validate command
 */
export function validateCommand(command) {
    const validTypes = [
        'add_sticky', 'add_node', 'add_connection',
        'select', 'delete', 'align', 'distribute',
        'group', 'ungroup', 'style', 'layout',
        'zoom', 'undo', 'redo', 'save'
    ];

    if (!command.type || !validTypes.includes(command.type)) {
        return false;
    }

    if (!command.payload || typeof command.payload !== 'object') {
        return false;
    }

    return true;
}

export default {
    processSpeech,
    processStreamChunk,
    validateCommand
};
