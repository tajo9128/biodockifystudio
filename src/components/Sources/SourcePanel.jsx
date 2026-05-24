import React, { useState } from 'react';
import './SourcePanel.css';

const SOURCE_TYPES = [
    { type: 'screen', label: 'Screen', icon: '🖥' },
    { type: 'camera', label: 'Camera', icon: '📷' },
    { type: 'text', label: 'Text', icon: 'T' },
    { type: 'color', label: 'Color', icon: '■' },
    { type: 'image', label: 'Image', icon: '🖼' },
];

export const SourcePanel = ({ scene, onAddSource, onRemoveSource, onUpdateSource, onClose }) => {
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    if (!scene) return null;

    const handleAdd = (type) => {
        const defaults = {
            screen: { name: 'Screen', config: { displaySurface: 'monitor' } },
            camera: { name: 'Camera', config: {} },
            text: { name: 'Text', config: { text: 'Hello World', fontSize: 32, color: '#ffffff', fontFamily: 'Outfit, sans-serif', fontWeight: 'bold' } },
            color: { name: 'Color', config: { color: '#1e1e2e' } },
            image: { name: 'Image', config: {} },
        };
        onAddSource({ type, ...defaults[type] });
        setAddMenuOpen(false);
    };

    return (
        <div className="source-panel">
            <div className="source-panel-header">
                <h3>Sources</h3>
                <button className="btn-icon-bg" onClick={onClose}>x</button>
            </div>
            <div className="source-panel-body">
                {scene.sources?.map((source, _i) => (
                    <div key={source.id} className={`source-item ${editingId === source.id ? 'editing' : ''}`}>
                        <div className="source-item-row">
                            <span className="source-item-icon">
                                {SOURCE_TYPES.find(t => t.type === source.type)?.icon || '?'}
                            </span>
                            <span className="source-item-name">{source.name}</span>
                            <div className="source-item-actions">
                                <button
                                    className="source-item-btn"
                                    onClick={() => onUpdateSource(source.id, { visible: !source.visible })}
                                    title={source.visible ? 'Hide' : 'Show'}
                                >
                                    {source.visible ? 'V' : '-'}
                                </button>
                                <button
                                    className="source-item-btn"
                                    onClick={() => onUpdateSource(source.id, { locked: !source.locked })}
                                    title={source.locked ? 'Unlock' : 'Lock'}
                                >
                                    {source.locked ? 'L' : 'U'}
                                </button>
                                <button
                                    className="source-item-btn"
                                    onClick={() => setEditingId(editingId === source.id ? null : source.id)}
                                    title="Edit"
                                >
                                    E
                                </button>
                                <button
                                    className="source-item-btn danger"
                                    onClick={() => onRemoveSource(source.id)}
                                    title="Remove"
                                >
                                    X
                                </button>
                            </div>
                        </div>
                        {editingId === source.id && (
                            <div className="source-item-edit">
                                <div className="source-edit-field">
                                    <label>Name</label>
                                    <input
                                        value={source.name}
                                        onChange={e => onUpdateSource(source.id, { name: e.target.value })}
                                    />
                                </div>
                                {source.type === 'text' && (
                                    <>
                                        <div className="source-edit-field">
                                            <label>Text</label>
                                            <input
                                                value={source.config?.text || ''}
                                                onChange={e => onUpdateSource(source.id, { config: { ...source.config, text: e.target.value } })}
                                            />
                                        </div>
                                        <div className="source-edit-field">
                                            <label>Font Size</label>
                                            <input
                                                type="number"
                                                value={source.config?.fontSize || 32}
                                                onChange={e => onUpdateSource(source.id, { config: { ...source.config, fontSize: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div className="source-edit-field">
                                            <label>Color</label>
                                            <input
                                                type="color"
                                                value={source.config?.color || '#ffffff'}
                                                onChange={e => onUpdateSource(source.id, { config: { ...source.config, color: e.target.value } })}
                                            />
                                        </div>
                                    </>
                                )}
                                {source.type === 'color' && (
                                    <div className="source-edit-field">
                                        <label>Color</label>
                                        <input
                                            type="color"
                                            value={source.config?.color || '#1e1e2e'}
                                            onChange={e => onUpdateSource(source.id, { config: { ...source.config, color: e.target.value } })}
                                        />
                                    </div>
                                )}
                                <div className="source-edit-field">
                                    <label>X Position (0-1)</label>
                                    <input
                                        type="number" step="0.01" min="0" max="1"
                                        value={source.transform?.x || 0}
                                        onChange={e => onUpdateSource(source.id, { transform: { ...source.transform, x: parseFloat(e.target.value) } })}
                                    />
                                </div>
                                <div className="source-edit-field">
                                    <label>Y Position (0-1)</label>
                                    <input
                                        type="number" step="0.01" min="0" max="1"
                                        value={source.transform?.y || 0}
                                        onChange={e => onUpdateSource(source.id, { transform: { ...source.transform, y: parseFloat(e.target.value) } })}
                                    />
                                </div>
                                <div className="source-edit-field">
                                    <label>Width (0-1)</label>
                                    <input
                                        type="number" step="0.01" min="0" max="1"
                                        value={source.transform?.width || 1}
                                        onChange={e => onUpdateSource(source.id, { transform: { ...source.transform, width: parseFloat(e.target.value) } })}
                                    />
                                </div>
                                <div className="source-edit-field">
                                    <label>Height (0-1)</label>
                                    <input
                                        type="number" step="0.01" min="0" max="1"
                                        value={source.transform?.height || 1}
                                        onChange={e => onUpdateSource(source.id, { transform: { ...source.transform, height: parseFloat(e.target.value) } })}
                                    />
                                </div>
                                <div className="source-edit-field">
                                    <label>Opacity (0-1)</label>
                                    <input
                                        type="number" step="0.01" min="0" max="1"
                                        value={source.transform?.opacity ?? 1}
                                        onChange={e => onUpdateSource(source.id, { transform: { ...source.transform, opacity: parseFloat(e.target.value) } })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {scene.sources?.length === 0 && (
                    <div className="source-empty">No sources. Click + to add one.</div>
                )}
            </div>
            <div className="source-panel-footer">
                <button className="source-add-btn" onClick={() => setAddMenuOpen(!addMenuOpen)}>+ Add Source</button>
                {addMenuOpen && (
                    <div className="source-add-menu">
                        {SOURCE_TYPES.map(t => (
                            <button key={t.type} className="source-add-item" onClick={() => handleAdd(t.type)}>
                                <span>{t.icon}</span>
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
