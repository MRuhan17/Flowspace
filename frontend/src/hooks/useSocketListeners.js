import { useEffect } from 'react';
import { socketService } from '../socket/socket';
import { useStore } from '../state/useStore';
import throttle from 'lodash/throttle';

/**
 * Hook to manage global socket subscriptions and state synchronization.
 */
export const useSocketListeners = () => {
    // Select actions from store to avoid re-running effect on every state change
    const setStrokes = useStore((state) => state.setStrokes);
    const receiveStroke = useStore((state) => state.receiveStroke);
    const updateCursor = useStore((state) => state.updateCursor);
    const activeBoardId = useStore((state) => state.activeBoardId);
    const setIsBoardLoading = useStore((state) => state.setIsBoardLoading);
    const setLayoutAnimation = useStore((state) => state.setLayoutAnimation); // New store value for triggering animation

    useEffect(() => {
        // Connect and join room
        socketService.joinRoom(activeBoardId);

        // Handlers
        const handleInit = (strokes) => {
            console.log(`[Socket] Board Init: ${strokes.length} strokes`);
            setStrokes(strokes);
            setIsBoardLoading(false);
        };

        const handleSync = (strokes) => {
            console.log(`[Socket] Sync received: ${strokes.length} strokes`);
            setStrokes(strokes);
            setIsBoardLoading(false);
        };

        const handleDraw = (stroke) => {
            receiveStroke(stroke);
        };

        // Throttled cursor update to prevent React render thrashing
        // (Though mapped cursors in Konva can handle 60fps usually, React state might be slower)
        const handleCursor = (data) => {
            // data: { userId, x, y }
            // We can dispatch directly or throttle if traffic is high
            updateCursor(data.userId, { x: data.x, y: data.y });
        };

        const handleLayoutUpdate = (layoutData) => {
            // layoutData: { [id]: { x, y } }
            // Instead of immediate update, we set a flag/data in store that CanvasBoard consumes to animate
            setLayoutAnimation(layoutData);
        };

        // Subscriptions
        const unsubInit = socketService.on('onInit', handleInit);
        const unsubSync = socketService.on('onSync', handleSync);
        const unsubDraw = socketService.on('onDraw', handleDraw);
        const unsubCursor = socketService.on('onCursor', handleCursor);
        const unsubLayout = socketService.on('onLayoutUpdate', handleLayoutUpdate);

        return () => {
            // Cleanup subscriptions
            unsubInit();
            unsubSync();
            unsubDraw();
            unsubCursor();
            unsubLayout();

            // Optionally leave room? 
            // socketService.socket.emit('leave-room', activeBoardId);
        };
    }, [activeBoardId, setStrokes, receiveStroke, updateCursor]);
};
