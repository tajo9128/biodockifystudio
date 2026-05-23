import React, { useState, useEffect } from 'react';

const SaveRecordingModal = ({ blob, mimeType, onSave, onDiscard, onYouTube }) => {
    const [fileName, setFileName] = useState('');
    const [extension, setExtension] = useState('.webm');

    useEffect(() => {
        if (blob) {
            let ext = '.webm';
            if (mimeType.includes('mp4')) ext = '.mp4';
            else if (mimeType.includes('matroska') || mimeType.includes('mkv')) ext = '.mkv';

            setExtension(ext);
            setFileName(`recording-${new Date().toLocaleDateString().replace(/\//g, '-')}-${new Date().toLocaleTimeString().replace(/:/g, '-').split(' ')[0]}`);
        }
    }, [blob, mimeType]);

    if (!blob) return null;

    const handleConfirm = () => {
        if (!fileName.trim()) return;
        const finalName = fileName.endsWith(extension) ? fileName : fileName + extension;
        onSave(blob, finalName);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.75rem', fontWeight: 800 }}>Save Recording? 🎥</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
                    Great recording! Give it a name before we save it to your workspace.
                </p>

                <div className="input-group" style={{ marginBottom: '2.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        File Name
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="my-awesome-video"
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '1rem 1.25rem',
                                background: 'var(--glass)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '14px',
                                color: 'var(--text-main)',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                        <span style={{
                            position: 'absolute',
                            right: '1.25rem',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            pointerEvents: 'none',
                            opacity: 0.8
                        }}>
                            {extension}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                    <button
                        className="btn btn-outline"
                        onClick={onDiscard}
                        style={{ flex: 1, padding: '1rem', justifyContent: 'center' }}
                    >
                        Discard
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={!fileName.trim()}
                        style={{ flex: 2, padding: '1rem', justifyContent: 'center' }}
                    >
                        Save Recording
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveRecordingModal;
