import React, { memo } from 'react';
import { useStore } from '../state/useStore';
import { MousePointer2 } from 'lucide-react';

// Memoized single cursor to prevent full list re-rendering if only one moves
const Cursor = memo(({ x, y, userId, color }) => {
    return (
        <div
            className="absolute top-0 left-0 pointer-events-none transition-transform duration-100 ease-linear z-30"
            style={{
                transform: `translate(${x}px, ${y}px)`,
                color: color || '#FF5733' // Default color if none
            }}
        >
            <MousePointer2 className="w-5 h-5 fill-current" />
            <div
                className="absolute left-4 top-4 px-2 py-0.5 rounded-full text-xs font-bold text-white whitespace-nowrap"
                style={{ backgroundColor: color || '#FF5733' }}
            >
                {userId.slice(0, 4)}
            </div>
        </div>
    );
});

export const CursorGhosts = () => {
    // Select cursors efficiently
    // We only want to re-render if cursors object changes
    const cursors = useStore((state) => state.cursors);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {Object.entries(cursors).map(([userId, pos]) => (
                <Cursor
                    key={userId}
                    userId={userId}
                    x={pos.x}
                    y={pos.y}
                    color={pos.color}
                />
            ))}
        </div>
    );
};
