// Socket initialization placeholder
// import { io } from 'socket.io-client';

// const socket = io('http://localhost:3000');
const socket = {
    on: (event, callback) => { console.log(`Listening for ${event}`); },
    emit: (event, data) => { console.log(`Emitting ${event}`, data); }
};

export default socket;
