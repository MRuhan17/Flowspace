import { io } from 'socket.io-client';

const URL = 'http://localhost:3000'; // Default backend URL
const socket = io(URL, {
    autoConnect: false // We can manually connect later or let it connect automatically if removed. Keeping it manageable.
});

// For debugging purposes
socket.onAny((event, ...args) => {
    console.log(event, args);
});

export default socket;
