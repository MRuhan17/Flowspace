import { io } from "socket.io-client";

// In production, this should come from env
const SERVER_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const socket = io(SERVER_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
});
