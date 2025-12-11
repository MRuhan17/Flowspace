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

// Socket.IO Setup
const io = new Server(server, {
    cors: config.cors
});

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/ai', aiRoutes);

// Error Handling (Must be last)
app.use(errorHandler);

// Setup Socket.IO
setupSocketHandlers(io);

// Start Server
server.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
    logger.info(`Wait... did I mention it's running? Yes, on port ${config.port}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
