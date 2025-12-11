export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join-room', (roomId) => {
            console.log(`User ${socket.id} joined room: ${roomId}`);
            socket.join(roomId);
            // Optionally emit a message to the room that a user has joined
            socket.to(roomId).emit('user-joined', socket.id);
        });

        socket.on('draw', (data) => {
            // In a real app, 'data' would include roomId
            const { roomId, ...drawData } = data;
            console.log('Draw event in room:', roomId, drawData);

            if (roomId) {
                socket.to(roomId).emit('draw', drawData); // Broadcast to room
            } else {
                socket.broadcast.emit('draw', data); // Fallback if no room logic yet
            }
        });

        socket.on('undo', (data) => {
            const { roomId } = data || {};
            console.log('Undo event', roomId ? `in room ${roomId}` : '');
            if (roomId) {
                socket.to(roomId).emit('undo');
            } else {
                socket.broadcast.emit('undo');
            }
        });

        socket.on('redo', (data) => {
            const { roomId } = data || {};
            console.log('Redo event', roomId ? `in room ${roomId}` : '');
            if (roomId) {
                socket.to(roomId).emit('redo');
            } else {
                socket.broadcast.emit('redo');
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
