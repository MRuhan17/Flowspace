import React, { useEffect, useRef } from 'react';
import { useStore } from '../state/useStore';
import { MousePointer2, Pencil, Eraser, Type, Hand } from 'lucide-react';

const STIFFNESS = 0.15;
const DAMPING = 0.8;

// Tool icon mapping
const TOOL_ICONS = {
    pen: Pencil,
    eraser: Eraser,
    select: Hand,
    text: Type,
};

// Generate avatar initials from userId
const getInitials = (userId) => {
    if (!userId) return '?';
    const parts = userId.split('-');
    return parts[0].substring(0, 2).toUpperCase();
};

// Generate username from userId (simplified)
const getUsername = (userId) => {
    if (!userId) return 'Anonymous';
    return `User ${userId.slice(0, 6)}`;
};

export const CursorPhysics = () => {
    const cursors = useStore((state) => state.cursors);

    // Store simulation state: { [userId]: { x, y, vx, vy } }
    const simState = useRef({});

    // Store DOM references: { [userId]: HTMLDivElement }
    const cursorRefs = useRef({});

    // RequestAnimationFrame ID
    const rafId = useRef();

    // Store latest cursors in ref for RAF loop
    const cursorsRef = useRef(cursors);
    useEffect(() => {
        cursorsRef.current = cursors;
    }, [cursors]);

    // Physics animation loop
    useEffect(() => {
        const animate = () => {
            const targets = cursorsRef.current;

            Object.keys(targets).forEach(userId => {
                const target = targets[userId];
                const el = cursorRefs.current[userId];

                if (!target || !el) return;

                if (!simState.current[userId]) {
                    simState.current[userId] = { x: target.x, y: target.y, vx: 0, vy: 0 };
                    el.style.transform = `translate(${target.x}px, ${target.y}px)`;
                    return;
                }

                const s = simState.current[userId];

                // Physics
                const dx = target.x - s.x;
                const dy = target.y - s.y;

                s.vx = (s.vx + dx * STIFFNESS) * DAMPING;
                s.vy = (s.vy + dy * STIFFNESS) * DAMPING;

                s.x += s.vx;
                s.y += s.vy;

                el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`;
            });

            rafId.current = requestAnimationFrame(animate);
        };

        rafId.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId.current);
    }, []);

    // Render cursors with user cards
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {Object.entries(cursors).map(([userId, data]) => {
                const ToolIcon = TOOL_ICONS[data.tool] || MousePointer2;
                const username = getUsername(userId);
                const initials = getInitials(userId);
                const color = data.color || '#FF5733';

                return (
                    <div
                        key={userId}
                        ref={el => cursorRefs.current[userId] = el}
                        className="absolute top-0 left-0"
                    >
                        {/* Cursor Icon */}
                        <MousePointer2 
                            className="w-5 h-5 drop-shadow-lg" 
                            style={{ color }}
                            fill={color}
                        />

                        {/* User Card */}
                        <div
                            className="absolute left-6 top-0 bg-white rounded-lg shadow-xl border border-gray-200 px-3 py-2 flex items-center gap-2 min-w-[140px] animate-fadeIn"
                            style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
                        >
                            {/* Avatar */}
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: color }}
                            >
                                {initials}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-gray-900 truncate">
                                    {username}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <ToolIcon className="w-3 h-3" />
                                    <span className="capitalize">{data.tool || 'select'}</span>
                                </div>
                            </div>

                            {/* Typing Indicator */}
                            {data.isTyping && (
                                <div className="flex gap-0.5">
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
