import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import aiRoutes from './routes/ai.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';

const app = express();
const server = http.createServer(app);

// Socket.IO Setup with CORS
const io = new Server(server, {
    cors: config.cors
});

// Global Middleware
app.use(cors(config.cors));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'flowspace-backend'
    });
});

// Mount Routes
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use(errorHandler);

// Initialize Socket Handlers (State management & Rooms)
setupSocketHandlers(io);

// Start Server
server.listen(config.port, () => {
    logger.info(`Flowspace Server is running on port ${config.port}`);
});

// Handle unhandled rejections for robustness
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    // In production, you might want to exit: process.exit(1);
});
