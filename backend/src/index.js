import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import aiRoutes from './routes/ai.js';
import layoutRoutes from './routes/layout.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';

const app = express();
const server = http.createServer(app);

// Socket.IO Configuration
const io = new Server(server, {
    cors: config.cors
});

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'Flowspace Backend',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/layout', layoutRoutes);

// Error Handling
app.use(errorHandler);

// Socket.IO Logic (includes room joining & per-board state)
setupSocketHandlers(io);

// Start Server
server.listen(config.port, () => {
    logger.info(`Flowspace server running on port ${config.port}`);
});

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
});
