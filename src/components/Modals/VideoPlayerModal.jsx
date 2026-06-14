import React, { useEffect } from 'react';

export const VideoPlayerModal = ({ url, onClose }) => {
    useEffect(() => {
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [url]);

    if (!url) return null;

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Video player">
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="btn-icon-bg modal-close" onClick={onClose} aria-label="Close video player">x</button>
                <video
                    src={url}
                    controls
                    autoPlay
                    style={{ width: '100%', display: 'block' }}
                />
            </div>
        </div>
    );
};
