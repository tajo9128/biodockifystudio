import React, { useState, useCallback } from 'react';
import './KeyframeEditor.css';

const INTERPOLATIONS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'];

export const KeyframeEditor = ({ clip, onAddKeyframe, onRemoveKeyframe, onClose }) => {
    const [selectedParam, setSelectedParam] = useState(null);
    const [newTime, setNewTime] = useState(0);
    const [newValue, setNewValue] = useState(0);
    const [interpolation, setInterpolation] = useState('linear');

    // Gather param keys from filters
    const paramKeys = [];
    if (clip?.filters) {
        clip.filters.forEach(f => {
            if (f.params) {
                Object.keys(f.params).forEach(k => {
                    const fullKey = `${f.filterId}.${k}`;
                    paramKeys.push({ id: fullKey, label: `${f.filterId} / ${k}` });
                });
            }
        });
    }
    // Also allow custom param keys
    if (clip?.keyframes) {
        Object.keys(clip.keyframes).forEach(k => {
            if (!paramKeys.find(p => p.id === k)) {
                paramKeys.push({ id: k, label: k });
            }
        });
    }

    const currentKeyframes = selectedParam ? (clip?.keyframes?.[selectedParam] || []) : [];

    const handleAdd = useCallback(() => {
        if (!selectedParam) return;
        onAddKeyframe?.(clip.id, selectedParam, newTime, newValue, interpolation);
    }, [clip, selectedParam, newTime, newValue, interpolation, onAddKeyframe]);

    const handleRemove = useCallback((time) => {
        if (!selectedParam) return;
        onRemoveKeyframe?.(clip.id, selectedParam, time);
    }, [clip, selectedParam, onRemoveKeyframe]);

    if (!clip) return null;

    return (
        <div className="keyframe-editor">
            <div className="kf-header">
                <h3>Keyframes</h3>
                <button className="btn-icon-bg" onClick={onClose}>x</button>
            </div>
            <div className="kf-body">
                <div className="kf-param-select">
                    <label>Parameter</label>
                    <select value={selectedParam || ''} onChange={e => setSelectedParam(e.target.value || null)}>
                        <option value="">-- select --</option>
                        {paramKeys.map(p => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                    </select>
                    <input
                        className="kf-input"
                        placeholder="or type param name"
                        onKeyDown={e => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                                setSelectedParam(e.target.value.trim());
                            }
                        }}
                    />
                </div>

                {selectedParam && (
                    <>
                        <div className="kf-list">
                            {currentKeyframes.length === 0 ? (
                                <div className="kf-empty">No keyframes. Add one below.</div>
                            ) : (
                                currentKeyframes.map((kf, i) => (
                                    <div key={i} className="kf-item">
                                        <span className="kf-time">{kf.time.toFixed(2)}s</span>
                                        <span className="kf-value">{typeof kf.value === 'number' ? kf.value.toFixed(1) : kf.value}</span>
                                        <span className="kf-interp">{kf.interpolation}</span>
                                        <button className="kf-remove" onClick={() => handleRemove(kf.time)} title="Remove">x</button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="kf-add-row">
                            <div className="kf-field">
                                <label>Time (s)</label>
                                <input type="number" className="kf-input" value={newTime}
                                    onChange={e => setNewTime(parseFloat(e.target.value) || 0)}
                                    min={0} max={clip.duration} step={0.1} />
                            </div>
                            <div className="kf-field">
                                <label>Value</label>
                                <input type="number" className="kf-input" value={newValue}
                                    onChange={e => setNewValue(parseFloat(e.target.value) || 0)}
                                    step={1} />
                            </div>
                            <div className="kf-field">
                                <label>Curve</label>
                                <select className="kf-input" value={interpolation}
                                    onChange={e => setInterpolation(e.target.value)}>
                                    {INTERPOLATIONS.map(i => (
                                        <option key={i} value={i}>{i}</option>
                                    ))}
                                </select>
                            </div>
                            <button className="btn btn-primary kf-add-btn" onClick={handleAdd}>Add</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
