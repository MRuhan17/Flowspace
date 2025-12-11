export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('draw', (data) => {
            console.log('Draw event:', data);
            socket.broadcast.emit('draw', data); // Broadcast to other clients
        });

        socket.on('undo', () => {
            console.log('Undo event');
            // Implement undo logic (e.g., update board state)
            socket.broadcast.emit('undo');
        });

        socket.on('redo', () => {
            console.log('Redo event');
            // Implement redo logic
            socket.broadcast.emit('redo');
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });

        // Add more handlers here
    });
};
