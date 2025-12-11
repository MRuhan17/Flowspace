import React, { useEffect, useState } from 'react';
import { useStore } from '../state/useStore';
import { Loader2 } from 'lucide-react';

export const SnapshotLoader = () => {
    const isBoardLoading = useStore((state) => state.isBoardLoading);
    const [showLabel, setShowLabel] = useState(false);

    // Fade in text after a moment if it takes too long
    useEffect(() => {
        let timer;
        if (isBoardLoading) {
            timer = setTimeout(() => setShowLabel(true), 1500);
        } else {
            setShowLabel(false);
        }
        return () => clearTimeout(timer);
    }, [isBoardLoading]);

    if (!isBoardLoading) return null;

    return (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col items-center justify-center transition-opacity duration-500">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>

                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse">
                    Flowspace
                </h2>

                {showLabel && (
                    <p className="text-gray-400 text-sm animate-fadeIn">
                        Loading board state...
                    </p>
                )}
            </div>
        </div>
    );
};
