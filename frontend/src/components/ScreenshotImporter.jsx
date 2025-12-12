import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, Image as ImageIcon, Loader, Edit2, ArrowRight } from 'lucide-react';
import './ScreenshotImporter.css';

/**
 * Screenshot Importer
 * 
 * Allows users to upload screenshots of diagrams, processes them via AI,
 * permits editing of the detected text, and imports them to the canvas.
 */
const ScreenshotImporter = ({ isOpen, onClose, onImport }) => {
    const [step, setStep] = useState('UPLOAD'); // UPLOAD, PROCESSING, REVIEW
    const [imagePreview, setImagePreview] = useState(null);
    const [parsedResult, setParsedResult] = useState(null);
    const [editableNodes, setEditableNodes] = useState([]);
    const fileInputRef = useRef(null);
    const [processingStage, setProcessingStage] = useState('');

    useEffect(() => {
        if (!isOpen) {
            resetState();
        }
    }, [isOpen]);

    const resetState = () => {
        setStep('UPLOAD');
        setImagePreview(null);
        setParsedResult(null);
        setEditableNodes([]);
        setProcessingStage('');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
            setStep('CONFIRM_IMAGE');
        };
        reader.readAsDataURL(file);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                processFile(blob);
                break;
            }
        }
    };

    // Global paste listener when modal is open
    useEffect(() => {
        if (isOpen && step === 'UPLOAD') {
            window.addEventListener('paste', handlePaste);
            return () => window.removeEventListener('paste', handlePaste);
        }
    }, [isOpen, step]);

    const handleGenerate = async () => {
        setStep('PROCESSING');
        setProcessingStage('Uploading image...');

        try {
            setProcessingStage('AI Vision analysis (this may take a moment)...');

            const response = await fetch('/api/ai/from-screenshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imagePreview })
            });

            const result = await response.json();

            if (result.success) {
                setParsedResult(result.data); // Keep original structure
                setEditableNodes(result.data.nodes); // Allow editing of nodes
                setStep('REVIEW');
            } else {
                alert('Analysis failed: ' + (result.error || 'Unknown error'));
                setStep('CONFIRM_IMAGE');
            }
        } catch (error) {
            console.error('Error generating diagram:', error);
            alert('Error generating diagram');
            setStep('CONFIRM_IMAGE');
        }
    };

    const handleNodeLabelChange = (id, newLabel) => {
        setEditableNodes(prev => prev.map(node =>
            node.id === id
                ? { ...node, data: { ...node.data, label: newLabel } }
                : node
        ));
    };

    const handleFinalImport = () => {
        // Merge edited nodes back with original edges
        const finalData = {
            nodes: editableNodes,
            edges: parsedResult.edges,
            meta: parsedResult.meta
        };

        onImport(finalData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="screenshot-importer-overlay">
            <div className="screenshot-importer-modal">
                <button className="close-button" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <h2>Import from Screenshot</h2>
                    <p>Convert whiteboard photos or diagrams into editable boards</p>
                </div>

                <div className="modal-content">
                    {step === 'UPLOAD' && (
                        <div
                            className="upload-zone"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="upload-icon-circle">
                                <Upload size={32} />
                            </div>
                            <h3>Click to upload or paste image</h3>
                            <p>Supports JPG, PNG, WebP</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>
                    )}

                    {step === 'CONFIRM_IMAGE' && (
                        <div className="confirm-step">
                            <div className="preview-container">
                                <img src={imagePreview} alt="Preview" />
                            </div>
                            <div className="actions">
                                <button className="secondary-btn" onClick={() => setStep('UPLOAD')}>
                                    Try Different Image
                                </button>
                                <button className="primary-btn" onClick={handleGenerate}>
                                    <Edit2 size={16} /> Generate Diagram
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'PROCESSING' && (
                        <div className="processing-state">
                            <div className="spinner-large"></div>
                            <h3>Analyzing Screenshot</h3>
                            <p>{processingStage}</p>
                            <div className="loading-steps">
                                <div className={`step ${processingStage.includes('Vision') ? 'active' : 'done'}`}>Running OCR</div>
                                <div className={`step ${processingStage.includes('Vision') ? 'active' : ''}`}> Detecting Shapes</div>
                                <div className={`step`}> Inferring Connections</div>
                            </div>
                        </div>
                    )}

                    {step === 'REVIEW' && (
                        <div className="review-step">
                            <div className="review-split">
                                <div className="split-col image-col">
                                    <h4>Original</h4>
                                    <div className="image-wrapper">
                                        <img src={imagePreview} alt="Original" />
                                    </div>
                                </div>
                                <div className="split-col data-col">
                                    <h4>Detected Elements ({editableNodes.length})</h4>
                                    <p className="hint">Review and edit text before importing</p>

                                    <div className="nodes-list">
                                        {editableNodes.map((node, idx) => (
                                            <div key={node.id} className="node-item">
                                                <div className="node-icon">
                                                    {/* Simple shape indicator */}
                                                    <div className={`shape-icon ${node.type}`}></div>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={node.data.label}
                                                    onChange={(e) => handleNodeLabelChange(node.id, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="summary-stats">
                                        <span>{parsedResult.edges.length} connections detected</span>
                                    </div>
                                </div>
                            </div>

                            <div className="actions right">
                                <button className="secondary-btn" onClick={() => setStep('CONFIRM_IMAGE')}>
                                    Back
                                </button>
                                <button className="primary-btn import-btn" onClick={handleFinalImport}>
                                    Import to Board <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScreenshotImporter;
