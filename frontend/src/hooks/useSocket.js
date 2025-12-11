import { useRef, useEffect, useState } from 'react';
import { socket } from '../socket/socketClient';

export const useSocketEvents = (roomId, { onDraw, onInit, onSync }) => {
    useEffect(() => {
        if (!roomId) return;

        socket.emit('join-room', roomId);

        const handleInit = ({ strokes }) => onInit(strokes);
        const handleDraw = (stroke) => onDraw(stroke);
        const handleSync = ({ strokes }) => onSync(strokes);

        socket.on('board-init', handleInit);
        socket.on('draw-stroke', handleDraw);
        socket.on('sync-board', handleSync);
        socket.on('draw', handleDraw); // Backward compat if needed

        return () => {
            socket.off('board-init', handleInit);
            socket.off('draw-stroke', handleDraw);
            socket.off('sync-board', handleSync);
            socket.off('draw', handleDraw);
        };
    }, [roomId, onDraw, onInit, onSync]);
};
