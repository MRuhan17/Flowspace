import React, { useState } from 'react';
import { X, AlertTriangle, Check, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import './UXFeedbackPanel.css';

/**
 * UX Feedback Panel
 * 
 * Displays design issues analysis and offers quick fixes.
 * 
 * Props:
 * - issues: Array of issue objects { id, severity, type, message, suggestion, fixAction? }
 * - scores: Object { clarity, hierarchy, accessibility }
 * - onHighlight: (nodeId) => void
 * - onApplyFix: (issue) => void
 * - onClose: () => void
 * - onRefresh: () => void
 */
const UXFeedbackPanel = ({
    issues = [],
    scores = { clarity: 0, hierarchy: 0, accessibility: 0 },
    onHighlight,
    onApplyFix,
    onClose,
    onRefresh
}) => {
    const [selectedIssueId, setSelectedIssueId] = useState(null);
    const [resolvedIssues, setResolvedIssues] = useState(new Set()); // IDs of resolved issues
    const [ignoredIssues, setIgnoredIssues] = useState(new Set()); // IDs of ignored issues

    // Group issues by type for filtering if needed, or better, by severity
    const activeIssues = issues.filter(i => !resolvedIssues.has(i.id + i.message) && !ignoredIssues.has(i.id + i.message));

    const handleIssueClick = (issue) => {
        setSelectedIssueId(issue.id + issue.message);
        if (onHighlight) {
            onHighlight(issue.id);
        }
    };

    const handleApply = (issue, e) => {
        e.stopPropagation();
        if (onApplyFix) {
            onApplyFix(issue);
            setResolvedIssues(prev => new Set(prev).add(issue.id + issue.message));
        }
    };

    const handleIgnore = (issue, e) => {
        e.stopPropagation();
        setIgnoredIssues(prev => new Set(prev).add(issue.id + issue.message));
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981'; // Green
        if (score >= 60) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    };

    return (
        <div className="ux-panel">
            <div className="ux-header">
                <h3>UX Audit</h3>
                <div className="header-actions">
                    <button onClick={onRefresh} title="Re-analyze" className="icon-btn">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={onClose} title="Close" className="icon-btn">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="ux-scores">
                <div className="score-item">
                    <div className="score-ring" style={{ borderColor: getScoreColor(scores.clarity) }}>
                        <span className="score-val">{scores.clarity}</span>
                    </div>
                    <span className="score-label">Clarity</span>
                </div>
                <div className="score-item">
                    <div className="score-ring" style={{ borderColor: getScoreColor(scores.hierarchy) }}>
                        <span className="score-val">{scores.hierarchy}</span>
                    </div>
                    <span className="score-label">Hierarchy</span>
                </div>
                <div className="score-item">
                    <div className="score-ring" style={{ borderColor: getScoreColor(scores.accessibility) }}>
                        <span className="score-val">{scores.accessibility}</span>
                    </div>
                    <span className="score-label">A11y</span>
                </div>
            </div>

            <div className="ux-issues-list">
                {activeIssues.length === 0 && (
                    <div className="empty-state">
                        <Check size={48} color="#10b981" />
                        <p>No issues detected! Great job.</p>
                    </div>
                )}

                {activeIssues.map((issue, idx) => {
                    const uniqueId = issue.id + issue.message;
                    const isSelected = selectedIssueId === uniqueId;

                    return (
                        <div
                            key={idx}
                            className={`issue-card ${issue.severity} ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleIssueClick(issue)}
                        >
                            <div className="issue-header">
                                <span className={`severity-badge ${issue.severity}`}>
                                    {issue.severity}
                                </span>
                                <span className="issue-type">{issue.type}</span>
                            </div>

                            <h4 className="issue-message">{issue.message}</h4>
                            <p className="issue-suggestion">{issue.suggestion}</p>

                            <div className="issue-actions">
                                <button className="ignore-btn" onClick={(e) => handleIgnore(issue, e)}>
                                    Ignore
                                </button>
                                <button className="fix-btn" onClick={(e) => handleApply(issue, e)}>
                                    Auto-Fix <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UXFeedbackPanel;
