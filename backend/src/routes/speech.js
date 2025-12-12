import express from 'express';
import multer from 'multer';
import { processSpeech, processStreamChunk, validateCommand } from '../ai/speechHandler.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '/tmp');
    },
    filename: (req, file, cb) => {
        cb(null, `audio-${Date.now()}.webm`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept audio files
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

/**
 * POST /api/speech/transcribe
 * Transcribe audio and extract commands
 */
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new AppError('No audio file provided', 400);
        }

        const options = {
            format: 'file',
            useLLM: req.body.useLLM !== 'false',
            includeConfidence: req.body.includeConfidence !== 'false'
        };

        const result = await processSpeech(req.file.path, options);

        res.json({
            success: result.success,
            data: {
                transcript: result.transcript,
                commands: result.commands,
                duration: result.duration,
                timestamp: result.timestamp
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/speech/process
 * Process base64 audio
 */
router.post('/process', async (req, res, next) => {
    try {
        const { audio, format = 'base64', useLLM = true, includeConfidence = true } = req.body;

        if (!audio) {
            throw new AppError('No audio data provided', 400);
        }

        const result = await processSpeech(audio, {
            format,
            useLLM,
            includeConfidence
        });

        res.json({
            success: result.success,
            data: {
                transcript: result.transcript,
                commands: result.commands,
                duration: result.duration,
                timestamp: result.timestamp
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/speech/validate
 * Validate command structure
 */
router.post('/validate', (req, res, next) => {
    try {
        const { command } = req.body;

        if (!command) {
            throw new AppError('No command provided', 400);
        }

        const isValid = validateCommand(command);

        res.json({
            success: true,
            data: {
                valid: isValid,
                command
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * WebSocket handler for streaming audio
 */
export function setupSpeechWebSocket(wss) {
    wss.on('connection', (ws) => {
        console.log('Speech WebSocket client connected');

        const streamState = {
            chunks: [],
            isProcessing: false
        };

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'audio_chunk') {
                    // Convert base64 to buffer
                    const chunk = Buffer.from(data.chunk, 'base64');

                    // Process chunk
                    if (!streamState.isProcessing) {
                        streamState.isProcessing = true;

                        const result = await processStreamChunk(chunk, streamState);

                        if (result && result.success) {
                            // Send result back to client
                            ws.send(JSON.stringify({
                                type: 'transcription',
                                transcript: result.transcript,
                                commands: result.commands,
                                timestamp: result.timestamp
                            }));
                        }

                        streamState.isProcessing = false;
                    } else {
                        // Queue chunk if still processing
                        streamState.chunks.push(chunk);
                    }
                } else if (data.type === 'start_stream') {
                    console.log('Starting audio stream');
                    streamState.chunks = [];
                    streamState.isProcessing = false;

                    ws.send(JSON.stringify({
                        type: 'stream_started',
                        timestamp: new Date().toISOString()
                    }));
                } else if (data.type === 'end_stream') {
                    console.log('Ending audio stream');

                    // Process any remaining chunks
                    if (streamState.chunks.length > 0) {
                        const combinedBuffer = Buffer.concat(streamState.chunks);
                        const result = await processSpeech(combinedBuffer, {
                            format: 'buffer',
                            useLLM: true,
                            includeConfidence: true
                        });

                        if (result.success) {
                            ws.send(JSON.stringify({
                                type: 'final_transcription',
                                transcript: result.transcript,
                                commands: result.commands,
                                timestamp: result.timestamp
                            }));
                        }
                    }

                    streamState.chunks = [];

                    ws.send(JSON.stringify({
                        type: 'stream_ended',
                        timestamp: new Date().toISOString()
                    }));
                }

            } catch (error) {
                console.error('WebSocket message error:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: error.message
                }));
            }
        });

        ws.on('close', () => {
            console.log('Speech WebSocket client disconnected');
        });

        ws.on('error', (error) => {
            console.error('Speech WebSocket error:', error);
        });
    });
}

export default router;
