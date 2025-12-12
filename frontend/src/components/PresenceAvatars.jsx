import React, { useEffect, useState } from 'react';
import { socketService } from '../socket/socket';
import { theme } from '../utils/theme';

const getRandomColor = (id) => {
    const colors = [
        '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF',
        '#33FFF5', '#FF8C33', '#8C33FF', '#FF3333', '#33FF8C'
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getInitials = (id) => {
    // Determine initials from ID (last 2 chars for variety if random ID)
    if (!id) return '??';
    return id.slice(-2).toUpperCase();
};

export const PresenceAvatars = () => {
    const [users, setUsers] = useState([]); // Array of { userId, color, joinedAt }

    useEffect(() => {
        // Listeners
        const handleJoin = ({ userId }) => {
            setUsers(prev => {
                if (prev.some(u => u.userId === userId)) return prev;
                return [...prev, { userId, color: getRandomColor(userId), joinedAt: Date.now() }];
            });
        };

        const handleLeave = ({ userId }) => {
            setUsers(prev => prev.filter(u => u.userId !== userId));
        };

        // Existing cursor moves might also indicate presence?
        // For strict "presence-join" requirement, we rely on that.
        // But initial load? We don't have a "roster".
        // We'll capture anyone who moves a cursor as well, just in case.
        const handleCursor = ({ userId }) => {
            setUsers(prev => {
                if (prev.some(u => u.userId === userId)) return prev;
                return [...prev, { userId, color: getRandomColor(userId), joinedAt: Date.now() }];
            });
        };

        // We need to attach these to socketService.
        // socketService expose generic 'on' method? Yes, Step 1244.
        // But socketService.on expects events that socketService EMITS internally (`_emit`).
        // Backend emits `presence-join`. 
        // socket.js needs to map `presence-join` to internal event or exposes raw socket?
        // socketService 'on' is for INTERNAL events.
        // We need to add mapping in socket.js OR expose raw socket.
        // socketService (Step 1244) does NOT have `presence-join` logic.
        // I should update socket.js to map these events.

        // TEMPORARY: I will use socketService.socket directly if exposed?
        // socketService.socket is exposed.

        // We need to attach these to socketService.
        // Now that socket.js supports 'onPresenceJoin', we use the facade.

        const unsubJoin = socketService.on('onPresenceJoin', handleJoin);
        const unsubLeave = socketService.on('onPresenceLeave', handleLeave);
        // Also listen for cursor moves to discover users who joined silently before us?
        // (Depends on if backend sends roster. It currently doesn't.)
        // We'll rely on cursor for discovery.
        const unsubCursor = socketService.on('onCursor', handleCursor);

        return () => {
            unsubJoin();
            unsubLeave();
            unsubCursor();
        };
    }, []);

    return (
        <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            display: 'flex',
            gap: 8,
            zIndex: 50,
            pointerEvents: 'none' // Let clicks pass through area
        }}>
            {users.map((user) => (
                <div
                    key={user.userId}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: user.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: 14,
                        boxShadow: theme.shadows.md,
                        border: '2px solid #fff',
                        transition: 'all 0.3s ease',
                        opacity: 1,
                        transform: 'scale(1)',
                        position: 'relative',
                        pointerEvents: 'auto',
                        cursor: 'help'
                    }}
                    title={`User ${user.userId}`}
                >
                    {getInitials(user.userId)}

                    {/* Status Indicator */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        backgroundColor: '#10B981', // Green
                        borderRadius: '50%',
                        border: '2px solid #fff'
                    }} />
                </div>
            ))}
        </div>
    );
};
