import React, { useEffect, useRef } from 'react';
import { useStore } from '../state/useStore';
import { MousePointer2 } from 'lucide-react';

const STIFFNESS = 0.15;
const DAMPING = 0.8;
const CUTOFF = 0.01; // Stop animation if close enough

export const CursorPhysics = () => {
    const cursors = useStore((state) => state.cursors);

    // Store simulation state: { [userId]: { x, y, vx, vy } }
    const simState = useRef({});

    // Store DOM references: { [userId]: HTMLDivElement }
    const cursorRefs = useRef({});

    // RequestAnimationFrame ID
    const rafId = useRef();

    useEffect(() => {
        const loop = () => {
            // For each visible cursor
            Object.keys(cursors).forEach(userId => {
                const target = cursors[userId]; // {x, y, color}
                const el = cursorRefs.current[userId];

                if (!target || !el) return;

                // Init sim state if missing
                if (!simState.current[userId]) {
                    simState.current[userId] = {
                        x: target.x,
                        y: target.y,
                        vx: 0,
                        vy: 0
                    };
                    // Set initial pos immediately
                    el.style.transform = `translate(${target.x}px, ${target.y}px)`;
                    return;
                }

                // Physics Step
                const current = simState.current[userId];

                // Force = (Target - Current) * Stiffness
                const fx = (target.x - current.x) * STIFFNESS;
                const fy = (target.y - current.y) * STIFFNESS;

                // Velocity = (Velocity + Force) * Damping
                current.vx = (current.vx + fx) * DAMPING;
                current.vy = (current.vy + fy) * DAMPING;

                // Update Position
                current.x += current.vx;
                current.y += current.vy;

                // Sleep check (optimization)
                // If extremely close and slow, just snap? 
                // Skip for smoothness, browsers handle transform updates well.

                // Apply to DOM
                el.style.transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;
            });

            // Cleanup simState for users who left
            Object.keys(simState.current).forEach(id => {
                if (!cursors[id]) {
                    delete simState.current[id];
                    delete cursorRefs.current[id];
                }
            });

            rafId.current = requestAnimationFrame(loop);
        };

        rafId.current = requestAnimationFrame(loop);

        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [cursors]); // Re-run if cursors object reference changes? 
    // Actually, if 'cursors' changes, the loop closure captures old 'cursors'?
    // 'cursors' in 'useStore' is likely a new object on update.
    // Ideally we use a Ref for latest 'cursors' target to avoid re-starting RAF loop constantly.

    // Optimization: Store latest cursors in ref
    const cursorsRef = useRef(cursors);
    useEffect(() => {
        cursorsRef.current = cursors;
    }, [cursors]);

    // Independent Loop
    useEffect(() => {
        const animate = () => {
            const targets = cursorsRef.current;

            Object.keys(targets).forEach(userId => {
                const target = targets[userId];
                const el = cursorRefs.current[userId]; // Refs are stable

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

    // Render static divs (React handles creation/removal, Physics handles movement)
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {Object.entries(cursors).map(([userId, pos]) => (
                <div
                    key={userId}
                    ref={el => cursorRefs.current[userId] = el}
                    className="absolute top-0 left-0" // No generic transition!
                    style={{
                        // Initial position set by Ref/Layout, handled by Physics primarily
                        // Color passed for child
                        color: pos.color || '#FF5733'
                    }}
                >
                    <MousePointer2 className="w-5 h-5 fill-current" />
                    <div
                        className="absolute left-4 top-4 px-2 py-0.5 rounded-full text-xs font-bold text-white whitespace-nowrap"
                        style={{ backgroundColor: pos.color || '#FF5733' }}
                    >
                        {userId.slice(0, 4)}
                    </div>
                </div>
            ))}
        </div>
    );
};
