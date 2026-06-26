import React, { useState } from 'react';
import './GuestPanel.css';

export const GuestPanel = ({ guests, roomId, onRemoveGuest, onAddToScene }) => {
    const [copied, setCopied] = useState(false);
    const guestUrl = roomId ? `${window.location.origin}/guest/${roomId}` : '';

    const handleCopy = () => {
        navigator.clipboard.writeText(guestUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="guest-panel">
            <h3 className="guest-panel__title">Guests</h3>

            {roomId && (
                <div className="guest-panel__link">
                    <label className="guest-panel__label">Guest Link</label>
                    <div className="guest-panel__url-row">
                        <input
                            type="text"
                            value={guestUrl}
                            readOnly
                            className="guest-panel__url"
                        />
                        <button className="guest-panel__copy" onClick={handleCopy}>
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            <div className="guest-panel__list">
                {guests.length === 0 ? (
                    <p className="guest-panel__empty">No guests connected</p>
                ) : (
                    guests.map(guest => (
                        <div key={guest.id} className="guest-panel__guest">
                            <div className="guest-panel__guest-info">
                                <span className="guest-panel__guest-dot" />
                                <span className="guest-panel__guest-name">{guest.name}</span>
                            </div>
                            <div className="guest-panel__guest-actions">
                                <button
                                    className="guest-panel__add-btn"
                                    onClick={() => onAddToScene?.(guest)}
                                    title="Add to scene"
                                >
                                    +Scene
                                </button>
                                <button
                                    className="guest-panel__remove-btn"
                                    onClick={() => onRemoveGuest(guest.id)}
                                    title="Remove guest"
                                >
                                    x
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
