import React, { useState } from 'react';
import { FilterPanel } from '../Filters/FilterPanel';
import { KeyframeEditor } from '../Timeline/KeyframeEditor';
import { getTransitionList } from '../../utils/Transitions';
import './RightPanel.css';

export const RightPanel = ({
    isOpen, onClose,
    activeTool,
    selectedClip,
    activeFilters, setActiveFilters,
    onRemoveKeyframe,
    onAddKeyframe,
    onSetTransition,
    onAddTextOverlay,
}) => {
    const [textValue, setTextValue] = useState('');
    const [textX, setTextX] = useState(50);
    const [textY, setTextY] = useState(50);
    const [textSize, setTextSize] = useState(24);

    if (!isOpen) return null;

    const transitions = getTransitionList();
    const activeTransition = selectedClip?.transitions?.out;

    return (
        <aside className="right-panel">
            <div className="right-panel-header">
                <h3 className="right-panel-title">
                    {activeTool === 'filter' ? 'Filters' :
                     activeTool === 'transition' ? 'Transitions' :
                     activeTool === 'keyframe' ? 'Keyframes' :
                     activeTool === 'text' ? 'Text Overlay' :
                     'Properties'}
                </h3>
                <button className="right-panel-close" onClick={onClose}>x</button>
            </div>

            <div className="right-panel-body">
                {activeTool === 'filter' && (
                    <FilterPanel
                        isOpen={true}
                        onClose={onClose}
                        activeFilters={activeFilters || []}
                        setActiveFilters={setActiveFilters}
                        embedded={true}
                    />
                )}

                {activeTool === 'transition' && (
                    <div className="rp-section">
                        {selectedClip ? (
                            <>
                                <div className="rp-label">Transition Type (applies to clip end)</div>
                                <div className="rp-transition-grid">
                                    {transitions.map(t => (
                                        <button
                                            key={t.id}
                                            className={`rp-transition-btn ${activeTransition === t.id ? 'active' : ''}`}
                                            title={t.name}
                                            onClick={() => onSetTransition?.(t.id)}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                                {activeTransition && (
                                    <button
                                        className="btn btn-outline"
                                        style={{ marginTop: '0.5rem', width: '100%' }}
                                        onClick={() => onSetTransition?.(null)}
                                    >
                                        Remove Transition
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="rp-empty">Select a clip first to apply transitions.</p>
                        )}
                    </div>
                )}

                {activeTool === 'keyframe' && selectedClip && (
                    <KeyframeEditor
                        clip={selectedClip}
                        onAddKeyframe={onAddKeyframe}
                        onRemoveKeyframe={onRemoveKeyframe}
                        onClose={onClose}
                    />
                )}

                {activeTool === 'keyframe' && !selectedClip && (
                    <div className="rp-section">
                        <p className="rp-empty">Select a clip first to manage keyframes.</p>
                    </div>
                )}

                {activeTool === 'text' && (
                    <div className="rp-section">
                        <div className="rp-label">Add Text Overlay</div>
                        <div className="rp-field">
                            <label>Text</label>
                            <input
                                type="text"
                                className="rp-input"
                                value={textValue}
                                onChange={e => setTextValue(e.target.value)}
                                placeholder="Enter text..."
                            />
                        </div>
                        <div className="rp-field-row">
                            <div className="rp-field">
                                <label>X (%)</label>
                                <input
                                    type="number"
                                    className="rp-input"
                                    value={textX}
                                    onChange={e => setTextX(parseFloat(e.target.value) || 0)}
                                    min={0} max={100}
                                />
                            </div>
                            <div className="rp-field">
                                <label>Y (%)</label>
                                <input
                                    type="number"
                                    className="rp-input"
                                    value={textY}
                                    onChange={e => setTextY(parseFloat(e.target.value) || 0)}
                                    min={0} max={100}
                                />
                            </div>
                        </div>
                        <div className="rp-field">
                            <label>Font Size</label>
                            <input
                                type="number"
                                className="rp-input"
                                value={textSize}
                                onChange={e => setTextSize(parseFloat(e.target.value) || 24)}
                                min={8} max={120}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '0.5rem', width: '100%' }}
                            disabled={!textValue.trim()}
                            onClick={() => {
                                onAddTextOverlay?.(textValue, textX, textY, textSize);
                                setTextValue('');
                            }}
                        >
                            Add Text Overlay
                        </button>
                    </div>
                )}

                {selectedClip && !activeTool && (
                    <div className="rp-section">
                        <div className="rp-label">Clip Properties</div>
                        <div className="rp-prop-row">
                            <span>Duration</span>
                            <span>{selectedClip.duration?.toFixed(2)}s</span>
                        </div>
                        <div className="rp-prop-row">
                            <span>Speed</span>
                            <span>{selectedClip.speed || 1}x</span>
                        </div>
                        <div className="rp-prop-row">
                            <span>Type</span>
                            <span>{selectedClip.type || 'video'}</span>
                        </div>
                        <div className="rp-prop-row">
                            <span>Track</span>
                            <span>{selectedClip.trackIndex}</span>
                        </div>
                        {(selectedClip.filters?.length > 0) && (
                            <div className="rp-prop-row">
                                <span>Filters</span>
                                <span>{selectedClip.filters.length}</span>
                            </div>
                        )}
                        {selectedClip.transitions?.out && (
                            <div className="rp-prop-row">
                                <span>Transition</span>
                                <span>{selectedClip.transitions.out}</span>
                            </div>
                        )}
                    </div>
                )}

                {!selectedClip && !activeTool && (
                    <div className="rp-empty-state">
                        <p>Select a clip to view properties</p>
                        <p className="rp-empty-hint">Use tools from the sidebar to edit</p>
                    </div>
                )}
            </div>
        </aside>
    );
};
