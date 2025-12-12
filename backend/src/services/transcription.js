import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

/**
 * Transcribe audio using OpenAI Whisper
 */
export async function transcribeAudio(req, res, next) {
    try {
        if (!req.file) {
            throw new Error('No audio file provided');
        }

        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        console.log('Transcribing audio file:', req.file.filename);

        // Create read stream from uploaded file
        const audioFile = fs.createReadStream(req.file.path);

        // Call Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
            response_format: 'json'
        });

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        console.log('Transcription result:', transcription.text);

        res.json({
            success: true,
            data: {
                text: transcription.text,
                duration: transcription.duration
            }
        });

    } catch (error) {
        logger.error('Transcription Error:', error);

        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        next(error);
    }
}

/**
 * Transcribe audio stream (for WebSocket)
 */
export async function transcribeStream(audioBuffer) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        // Save buffer to temporary file
        const tempPath = path.join('/tmp', `audio-${Date.now()}.webm`);
        fs.writeFileSync(tempPath, audioBuffer);

        // Create read stream
        const audioFile = fs.createReadStream(tempPath);

        // Call Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en',
            response_format: 'json'
        });

        // Clean up
        fs.unlinkSync(tempPath);

        return {
            success: true,
            text: transcription.text,
            duration: transcription.duration
        };

    } catch (error) {
        logger.error('Stream Transcription Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export default { transcribeAudio, transcribeStream };
