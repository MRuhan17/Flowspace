import { io } from "socket.io-client";

class FlowspaceSocket {
    constructor() {
        this.serverUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
        this.socket = null;
        this.isConnected = false;

        // Event Listeners Storage
        this.listeners = {
            onInit: [],
            onDraw: [],
            onSync: [],
            onCursor: [],
            onUndo: [], // Implicitly handled by sync usually, but good to have
            onRedo: [],
            onPresenceJoin: [],
            onPresenceLeave: []
        };
    }

    connect() {
        if (this.socket) return;

        this.socket = io(this.serverUrl, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 1000,
        });

        this.socket.on("connect", () => {
            console.log("Socket connected:", this.socket.id);
            this.isConnected = true;
        });

        this.socket.on("disconnect", () => {
            console.warn("Socket disconnected");
            this.isConnected = false;
        });

        // Backend Event Mapping
        this.socket.on("board-init", (data) => this._emit('onInit', data.elements || data.strokes));
        this.socket.on("draw-stroke", (stroke) => this._emit('onDraw', stroke));

        // Map specific events to generic onDraw for store handling
        this.socket.on("node-add", (node) => this._emit('onDraw', node));
        this.socket.on("node-update", (node) => this._emit('onDraw', node));
        this.socket.on("connector-add", (conn) => this._emit('onDraw', conn));
        this.socket.on("connector-update", (conn) => this._emit('onDraw', conn));

        this.socket.on("sync-board", (data) => this._emit('onSync', data.elements || data.strokes));
        this.socket.on("cursor-move", (data) => this._emit('onCursor', data));

        // Presence
        this.socket.on("presence-join", (data) => this._emit('onPresenceJoin', data));
        this.socket.on("presence-leave", (data) => this._emit('onPresenceLeave', data));
    }

    joinRoom(roomId) {
        if (!this.socket) this.connect();
        this.socket.emit("join-room", roomId);
    }

    // --- Actions ---

    sendStroke(roomId, stroke) {
        if (!this.socket) return;
        this.socket.emit("draw-stroke", { roomId, stroke });
    }

    sendNodeAdd(roomId, node) {
        if (!this.socket) return;
        this.socket.emit("node-add", { roomId, node });
    }

    sendNodeUpdate(roomId, node) {
        if (!this.socket) return;
        this.socket.emit("node-update", { roomId, node });
    }

    sendConnectorAdd(roomId, connector) {
        if (!this.socket) return;
        this.socket.emit("connector-add", { roomId, connector });
    }

    sendConnectorUpdate(roomId, connector) {
        if (!this.socket) return;
        this.socket.emit("connector-update", { roomId, connector });
    }

    sendUndo(roomId) {
        if (!this.socket) return;
        this.socket.emit("undo", { roomId });
    }

    sendRedo(roomId) {
        if (!this.socket) return;
        this.socket.emit("redo", { roomId });
    }

    sendCursor(roomId, x, y) {
        if (!this.socket) return;
        // Optimization: Don't allow cursor emits if unconnected
        this.socket.emit('cursor-move', { roomId, x, y });
    }

    sendLayoutUpdate(roomId, layoutData) {
        if (!this.socket) return;
        this.socket.emit('layout-update', { roomId, updates: layoutData });
    }

    sendSyncRequest(roomId) {
        if (!this.socket) return;
        this.socket.emit("sync-request", { roomId });
    }

    // --- Subscriptions ---

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    _emit(event, payload) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(payload));
        }
    }
}

// Singleton instance
export const socketService = new FlowspaceSocket();
