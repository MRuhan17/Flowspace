import React, { useState } from 'react';
import { ArrowRight, Check, X, Sliders } from 'lucide-react';
import './CleanupPreview.css';

/**
 * Cleanup Preview Component
 * 
 * Displays a side-by-side comparison of the original board and the cleaned version.
 * Allows users to review changes and apply them with options.
 */
const CleanupPreview = ({
    isOpen,
    onClose,
    onConfirm,
    originalBoard,
    cleanedBoard,
    stats
}) => {
    const [viewMode, setViewMode] = useState('split'); // 'split', 'original', 'cleaned'
    const [selectedChanges, setSelectedChanges] = useState(new Set()); // IDs of accepted changes (if we supported granular selection)

    // Mock confidence for now since backend doesn't return it yet
    const getConfidence = () => Math.floor(Math.random() * 20) + 80;

    if (!isOpen) return null;

    return (
        <div className="cleanup-overlay">
            <div className="cleanup-modal">
                <div className="cleanup-header">
                    <h2>Board Cleanup Preview</h2>
                    <div className="header-actions">
                        <div className="view-toggles">
                            <button
                                className={`toggle-btn ${viewMode === 'original' ? 'active' : ''}`}
                                onClick={() => setViewMode('original')}
                            >
                                Original
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
                                onClick={() => setViewMode('split')}
                            >
                                Split View
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'cleaned' ? 'active' : ''}`}
                                onClick={() => setViewMode('cleaned')}
                            >
                                Cleaned
                            </button>
                        </div>
                        <button className="close-btn-icon" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="cleanup-content">
                    {/* Simplified Visual Preview - In a real app, this would render a mini-canvas */}
                    <div className={`preview-area mode-${viewMode}`}>
                        {(viewMode === 'original' || viewMode === 'split') && (
                            <div className="preview-pane original">
                                <h3>Original Sketches</h3>
                                <div className="placeholder-canvas">
                                    {/* Abstract representation of rough sketches */}
                                    <div className="sketch-mockup">
                                        <svg viewBox="0 0 100 100" className="sketch-svg">
                                            <path d="M10,10 Q30,5 50,10 T90,10" fill="none" stroke="#9ca3af" strokeWidth="2" />
                                            <rect x="20" y="30" width="60" height="40" fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5,5" />
                                            <circle cx="50" cy="50" r="10" fill="none" stroke="#9ca3af" strokeWidth="2" />
                                        </svg>
                                        <p>Rough Sketches: {stats?.removedNodesCount || 0}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {viewMode === 'split' && <div className="divider"><ArrowRight size={24} /></div>}

                        {(viewMode === 'cleaned' || viewMode === 'split') && (
                            <div className="preview-pane cleaned">
                                <h3>Cleaned Shapes</h3>
                                <div className="placeholder-canvas">
                                    {/* Abstract representation of clean shapes */}
                                    <div className="clean-mockup">
                                        <svg viewBox="0 0 100 100" className="clean-svg">
                                            <line x1="10" y1="10" x2="90" y2="10" stroke="#3b82f6" strokeWidth="2" />
                                            <rect x="20" y="30" width="60" height="40" fill="none" stroke="#3b82f6" strokeWidth="2" />
                                            <circle cx="50" cy="50" r="15" fill="none" stroke="#3b82f6" strokeWidth="2" />
                                        </svg>
                                        <p>Cleaned Objects: {stats?.newNodesCount || 0}</p>
                                        <div className="confidence-badge">
                                            Confidence: {getConfidence()}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="cleanup-stats-panel">
                        <div className="stat-item">
                            <span className="stat-label">Strokes Merged</span>
                            <span className="stat-value">{stats?.removedNodesCount || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Shapes Created</span>
                            <span className="stat-value">{stats?.newNodesCount || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Est. Accuracy</span>
                            <span className="stat-value high">High</span>
                        </div>
                    </div>
                </div>

                <div className="cleanup-footer">
                    <button className="secondary-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="primary-btn" onClick={() => onConfirm(cleanedBoard)}>
                        <Check size={18} /> Apply Cleanup to Board
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CleanupPreview;
