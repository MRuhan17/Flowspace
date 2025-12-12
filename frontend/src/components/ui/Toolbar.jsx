import React, { useState } from 'react';
import { useStore } from '../../state/useStore'; // Updated from useBoardStore
import { TOOLS, BOARD_COLORS } from '../../utils/constants';
import {
    Pencil, Eraser, Undo, Redo,
    MousePointer2, Minus, Maximize,
    Sparkles, Loader2, Trash2, Group,
    Lock, Unlock, Ungroup, BringToFront, SendToBack,
    Bot
} from 'lucide-react';
import clsx from 'clsx';
import { layoutService } from '../../api/layoutService';

export const Toolbar = () => {
    const {
        toolMode: tool, setToolMode,
        brushColor: color, setBrushColor,
        brushSize: strokeWidth, setBrushSize,
        undo, redo,
        strokes,
        setStrokes,
        selectedObjectIds,
        toggleLock, updateZIndex, groupElements, updateNode,
        toggleAiAssistant, isAiAssistantOpen,
        clearSelection
    } = useStore();

    const [isLayouting, setIsLayouting] = useState(false);

    const handleSliderChange = (e) => {
        setBrushSize(Number(e.target.value));
    };

    const handleAutoLayout = async () => {
        if (isLayouting || strokes.length === 0) return;

        setIsLayouting(true);
        try {
            // Convert strokes to objects for layout
            // For now, we'll treat each stroke as an object
            const objects = strokes.map((stroke, index) => ({
                id: stroke.id || `stroke-${index}`,
                x: stroke.points[0] || 0,
                y: stroke.points[1] || 0,
                width: 100,
                height: 100,
                text: `Stroke ${index + 1}`,
                type: 'stroke'
            }));

            const layoutedObjects = await layoutService.autoLayout(objects, 'smart');

            // Map back to strokes with new positions
            const updatedStrokes = strokes.map((stroke, index) => {
                const layouted = layoutedObjects[index];
                if (!layouted) return stroke;

                // Offset all points by the difference
                const deltaX = layouted.x - (stroke.points[0] || 0);
                const deltaY = layouted.y - (stroke.points[1] || 0);

                return {
                    ...stroke,
                    points: stroke.points.map((val, i) =>
                        i % 2 === 0 ? val + deltaX : val + deltaY
                    )
                };
            });

            setStrokes(updatedStrokes);
        } catch (error) {
            console.error('Auto layout failed:', error);
        } finally {
            setIsLayouting(false);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedObjectIds.length === 0) return;

        const remaining = strokes.filter(s => !selectedObjectIds.includes(s.id));
        setStrokes(remaining);

        import('../../socket/socket').then(({ socketService }) => {
            // Emit deletion event to sync with other users
            socketService.socket.emit('delete-elements', {
                roomId: useStore.getState().activeBoardId,
                ids: selectedObjectIds
            });
        });

        clearSelection();
    };

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-50">

            {/* Primary Toolbar */}
            <div className="bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur-md shadow-2xl shadow-gray-200/50 rounded-2xl p-2.5 flex items-center gap-4 border border-gray-100 ring-1 ring-black/5 transition-all hover:shadow-3xl hover:bg-white/90">

                {/* Tools Group */}
                <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                    <button
                        onClick={() => setToolMode(TOOLS.SELECT)}
                        title="Select (V)"
                        className={clsx(
                            "p-2.5 rounded-lg transition-all duration-200",
                            tool === TOOLS.SELECT
                                ? "bg-white text-blue-600 shadow-sm scale-100 font-medium"
                                : "text-gray-500 hover:text-gray-700 hover:bg-black/5"
                        )}
                    >
                        <MousePointer2 size={18} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setToolMode(TOOLS.PEN)}
                        title="Pen (P)"
                        className={clsx(
                            "p-2.5 rounded-lg transition-all duration-200",
                            tool === TOOLS.PEN
                                ? "bg-white text-blue-600 shadow-sm scale-100 font-medium"
                                : "text-gray-500 hover:text-gray-700 hover:bg-black/5"
                        )}
                    >
                        <Pencil size={18} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setToolMode(TOOLS.ERASER)}
                        title="Eraser (E)"
                        className={clsx(
                            "p-2.5 rounded-lg transition-all duration-200",
                            tool === TOOLS.ERASER
                                ? "bg-white text-blue-600 shadow-sm scale-100 font-medium"
                                : "text-gray-500 hover:text-gray-700 hover:bg-black/5"
                        )}
                    >
                        <Eraser size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>

                {/* Stroke Settings */}
                <div className="flex items-center gap-5 px-1">
                    <div className="flex items-center gap-2 group relative">
                        <Minus size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={strokeWidth}
                            onChange={handleSliderChange}
                            className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <Maximize size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />

                        {/* Floating Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-md opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none shadow-lg">
                            {strokeWidth}px
                        </div>
                    </div>

                    {/* Palette */}
                    <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
                        {Object.values(BOARD_COLORS).map((c) => (
                            <button
                                key={c}
                                onClick={() => setBrushColor(c)}
                                className={clsx(
                                    "w-6 h-6 rounded-full transition-all duration-200 relative group",
                                    "hover:shadow-md hover:scale-110 active:scale-95",
                                    color === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-sm z-10" : "border border-gray-200"
                                )}
                                style={{ backgroundColor: c }}
                                title={c}
                            >
                                {color === c && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full shadow-sm"></span>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>

                {/* History Actions */}
                <div className="flex gap-1">
                    <button onClick={undo} className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95" title="Undo (Ctrl+Z)">
                        <Undo size={18} strokeWidth={2.5} />
                    </button>
                    <button onClick={redo} className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95" title="Redo (Ctrl+Y)">
                        <Redo size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>

                {/* Auto Layout */}
                <button
                    onClick={handleAutoLayout}
                    disabled={isLayouting || strokes.length === 0}
                    className={clsx(
                        "px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2",
                        isLayouting || strokes.length === 0
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg active:scale-95"
                    )}
                    title="Auto organize canvas objects"
                >
                    {isLayouting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Organizing...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            <span>Auto Layout</span>
                        </>
                    )}
                </button>

                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>

                <button
                    onClick={toggleAiAssistant}
                    className={clsx(
                        "p-2.5 rounded-lg transition-all active:scale-95",
                        isAiAssistantOpen
                            ? "bg-purple-100 text-purple-600 shadow-inner"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    )}
                    title="Design AI Assistant"
                >
                    <Bot size={18} strokeWidth={2.5} />
                </button>

                {selectedObjectIds.length > 0 && (
                    <>
                        <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>
                        <div className="flex gap-1 animate-fadeIn">
                            {/* Layer Controls */}
                            <button
                                onClick={() => selectedObjectIds.forEach(id => updateZIndex(id, 'front'))}
                                className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95"
                                title="Bring to Front"
                            >
                                <BringToFront size={18} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => selectedObjectIds.forEach(id => updateZIndex(id, 'back'))}
                                className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95"
                                title="Send to Back"
                            >
                                <SendToBack size={18} strokeWidth={2.5} />
                            </button>

                            <div className="w-px h-4 bg-gray-200 mx-1 self-center"></div>

                            {/* Lock Controls */}
                            <button
                                onClick={() => toggleLock(selectedObjectIds, true)}
                                className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95"
                                title="Lock Selected"
                            >
                                <Lock size={18} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => toggleLock(selectedObjectIds, false)}
                                className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95"
                                title="Unlock Selected"
                            >
                                <Unlock size={18} strokeWidth={2.5} />
                            </button>

                            <div className="w-px h-4 bg-gray-200 mx-1 self-center"></div>

                            {/* Group Controls */}
                            <button
                                onClick={() => groupElements(selectedObjectIds)}
                                className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95"
                                title="Group (Ctrl+G)"
                            >
                                <Group size={18} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => selectedObjectIds.forEach(id => updateNode(id, { groupId: null }))}
                                className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors active:scale-95"
                                title="Ungroup"
                            >
                                <Ungroup size={18} strokeWidth={2.5} />
                            </button>

                            <div className="w-px h-4 bg-gray-200 mx-1 self-center"></div>

                            <button
                                onClick={handleDeleteSelected}
                                className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors active:scale-95"
                                title="Delete Selected (Del)"
                            >
                                <Trash2 size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
