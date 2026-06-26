import React, { useState, useRef, useEffect } from 'react';
import './MarkerPopup.css';

export const MarkerPopup = ({ marker, onClose, onUpdate, colors }) => {
    const [label, setLabel] = useState(marker.label || '');
    const [color, setColor] = useState(marker.color || '#f59e0b');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate({ label, color });
    };

    return (
        <div className="tl-marker-popup-overlay" onClick={onClose}>
            <div className="tl-marker-popup" onClick={e => e.stopPropagation()}>
                <h4>Marker</h4>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        className="tl-marker-popup-input"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder="Marker name (e.g. Introduction)"
                    />
                    <div className="tl-marker-popup-colors">
                        {colors.map(c => (
                            <button
                                key={c}
                                type="button"
                                className={`tl-marker-popup-color ${c === color ? 'active' : ''}`}
                                style={{ background: c }}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>
                    <div className="tl-marker-popup-actions">
                        <button type="button" className="tl-marker-popup-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="tl-marker-popup-save">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
