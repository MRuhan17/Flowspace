import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import aiRoutes from './routes/ai.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

app.use('/api/ai', aiRoutes);

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
