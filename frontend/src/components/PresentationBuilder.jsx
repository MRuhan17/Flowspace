import React, { useState } from 'react';
import { Play, Download, X, Film, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';
import './PresentationBuilder.css';

/**
 * Presentation Builder Interface
 * 
 * Allows users to generate, preview, edit, and export presentations
 * generated from their whiteboard content.
 */
const PresentationBuilder = ({ isOpen, onClose, boardData }) => {
    const [step, setStep] = useState('CONFIG'); // CONFIG, GENERATING, PREVIEW
    const [config, setConfig] = useState({ style: 'executive', slidesCount: 5 });
    const [slides, setSlides] = useState([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setStep('GENERATING');
        try {
            const response = await fetch('/api/ai/presentation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boardJSON: boardData,
                    settings: { ...config, format: 'json' }
                })
            });
            const result = await response.json();

            if (result.success && result.data.data.slides) {
                setSlides(result.data.data.slides);
                setStep('PREVIEW');
            } else {
                alert('Failed to generate presentation');
                setStep('CONFIG');
            }
        } catch (error) {
            console.error(error);
            setStep('CONFIG');
        }
    };

    const handleDownload = async (format) => {
        setIsExporting(true);
        try {
            // Re-request strictly for download if needed, or use client-side generator if available.
            // For simplicity, we call the API again or assume we can convert current state.
            // Here, we'll just mock the download call to the backend endpoint that returns base64
            const response = await fetch('/api/ai/presentation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boardJSON: boardData, // In real app, pass edited slides back to server used as context or strictly for rendering
                    settings: { ...config, format: 'pptx' }
                })
            });
            const result = await response.json();
            if (result.success && result.data.data) {
                // Trigger download
                const link = document.createElement('a');
                link.href = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${result.data.data}`;
                link.download = result.data.filename || 'presentation.pptx';
                link.click();
            }
        } catch (e) {
            alert('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const updateCurrentSlide = (field, value) => {
        const newSlides = [...slides];
        newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], [field]: value };
        setSlides(newSlides);
    };

    const updateBullet = (idx, value) => {
        const newSlides = [...slides];
        const newBullets = [...newSlides[currentSlideIndex].bullets];
        newBullets[idx] = value;
        newSlides[currentSlideIndex].bullets = newBullets;
        setSlides(newSlides);
    };

    return (
        <div className="presentation-overlay">
            <div className="presentation-modal">
                <button className="close-btn-float" onClick={onClose}><X /></button>

                {step === 'CONFIG' && (
                    <div className="config-view">
                        <div className="icon-header">
                            <Film size={48} className="text-blue-500" />
                            <h2>Generate Presentation</h2>
                            <p>Turn your chaotic board into a structured deck.</p>
                        </div>

                        <div className="form-group">
                            <label>Style</label>
                            <div className="style-grid">
                                {['executive', 'technical', 'creative', 'minimal'].map(s => (
                                    <div
                                        key={s}
                                        className={`style-card ${config.style === s ? 'selected' : ''}`}
                                        onClick={() => setConfig({ ...config, style: s })}
                                    >
                                        <div className={`style-preview preview-${s}`}></div>
                                        <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Length: {config.slidesCount} Slides</label>
                            <input
                                type="range"
                                min="3" max="10"
                                value={config.slidesCount}
                                onChange={(e) => setConfig({ ...config, slidesCount: parseInt(e.target.value) })}
                            />
                        </div>

                        <button className="primary-btn-large" onClick={handleGenerate}>
                            Generate Deck <Play size={16} />
                        </button>
                    </div>
                )}

                {step === 'GENERATING' && (
                    <div className="generating-view">
                        <div className="spinner-xl"></div>
                        <h3>Writing Story...</h3>
                        <p>Our AI is analyzing {boardData?.nodes?.length || 0} nodes to build your narrative.</p>
                    </div>
                )}

                {step === 'PREVIEW' && (
                    <div className="preview-view">
                        <div className="preview-header">
                            <button className="secondary-btn" onClick={() => setStep('CONFIG')}>Back</button>
                            <div className="slide-counter">Slide {currentSlideIndex + 1} of {slides.length}</div>
                            <div className="actions">
                                <button
                                    className={`edit-toggle ${isEditing ? 'active' : ''}`}
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    <Edit3 size={16} /> Edit
                                </button>
                                <button className="primary-btn" onClick={() => handleDownload('pptx')} disabled={isExporting}>
                                    {isExporting ? 'Exporting...' : 'Download PPTX'} <Download size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="slide-stage">
                            <button
                                className="nav-btn prev"
                                disabled={currentSlideIndex === 0}
                                onClick={() => setCurrentSlideIndex(c => c - 1)}
                            >
                                <ChevronLeft />
                            </button>

                            <div className={`slide-canvas style-${config.style}`}>
                                {isEditing ? (
                                    <div className="slide-editor">
                                        <input
                                            className="edit-title"
                                            value={slides[currentSlideIndex].title}
                                            onChange={(e) => updateCurrentSlide('title', e.target.value)}
                                        />
                                        <div className="edit-bullets">
                                            {slides[currentSlideIndex].bullets.map((b, i) => (
                                                <div key={i} className="bullet-row">
                                                    <span>•</span>
                                                    <input
                                                        value={b}
                                                        onChange={(e) => updateBullet(i, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <textarea
                                            className="edit-notes"
                                            value={slides[currentSlideIndex].notes}
                                            onChange={(e) => updateCurrentSlide('notes', e.target.value)}
                                            placeholder="Speaker notes..."
                                        />
                                    </div>
                                ) : (
                                    <div className="slide-content">
                                        <h1>{slides[currentSlideIndex].title}</h1>
                                        <ul>
                                            {slides[currentSlideIndex].bullets.map((b, i) => (
                                                <li key={i}>{b}</li>
                                            ))}
                                        </ul>
                                        <div className="speaker-notes-preview">
                                            <strong>Speaker Notes:</strong> {slides[currentSlideIndex].notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                className="nav-btn next"
                                disabled={currentSlideIndex === slides.length - 1}
                                onClick={() => setCurrentSlideIndex(c => c + 1)}
                            >
                                <ChevronRight />
                            </button>
                        </div>

                        <div className="thumbnails">
                            {slides.map((s, i) => (
                                <div
                                    key={i}
                                    className={`thumb ${i === currentSlideIndex ? 'active' : ''}`}
                                    onClick={() => setCurrentSlideIndex(i)}
                                >
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PresentationBuilder;
