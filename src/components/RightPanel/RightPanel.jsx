import React from 'react';
import { FilterPanel } from '../Filters/FilterPanel';
import './RightPanel.css';

export const RightPanel = ({
    isOpen, onClose,
    activeTool,
    // Clip properties
    selectedClip,
    // Filter panel props
    activeFilters, setActiveFilters,
    // Keyframe props
    onRemoveKeyframe,
}) => {
    if (!isOpen) return null;

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
                        activeFilters={activeFilters}
                        setActiveFilters={setActiveFilters}
                        embedded={true}
                    />
                )}

                {activeTool === 'transition' && (
                    <div className="rp-section">
                        <div className="rp-label">Transition Type</div>
                        <div className="rp-transition-grid">
                            {['crossfade', 'fadeBlack', 'wipeLeft', 'wipeRight', 'wipeUp', 'wipeDown',
                              'slideLeft', 'zoomIn', 'dissolve', 'barnDoor', 'iris', 'clockWipe', 'push'].map(t => (
                                <button key={t} className="rp-transition-btn" title={t}>
                                    {t.replace(/([A-Z])/g, ' $1').trim()}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTool === 'keyframe' && selectedClip && (
                    <div className="rp-section">
                        <div className="rp-label">Keyframes</div>
                        <div className="rp-keyframe-list">
                            {Object.entries(selectedClip.keyframes || {}).map(([param, kfs]) => (
                                <div key={param} className="rp-keyframe-param">
                                    <span className="rp-keyframe-param-name">{param}</span>
                                    {kfs.map((kf, i) => (
                                        <div key={i} className="rp-keyframe-item">
                                            <span>t={kf.time.toFixed(2)}s</span>
                                            <span>v={typeof kf.value === 'number' ? kf.value.toFixed(1) : kf.value}</span>
                                            <button className="rp-keyframe-del" onClick={() => onRemoveKeyframe?.(selectedClip.id, param, kf.time)}>x</button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {Object.keys(selectedClip.keyframes || {}).length === 0 && (
                                <p className="rp-empty">No keyframes. Select a clip and add keyframes to animate properties over time.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTool === 'text' && (
                    <div className="rp-section">
                        <div className="rp-label">Text Overlay</div>
                        <p className="rp-empty">Use the Draw tool (D) to add annotations. Text overlays can be added via the AI assistant or timeline.</p>
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
