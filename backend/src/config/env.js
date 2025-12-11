import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ["GET", "POST"]
    },
    redis: {
        url: process.env.REDIS_URL // Optional for future scaling
    }
};
