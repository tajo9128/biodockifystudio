import React, { useRef } from 'react';
import './ClipBin.css';

export const ClipBin = ({ clips, onImport, onRemove, onAddToTimeline, onPreview }) => {
    const fileRef = useRef(null);

    const handleImport = (e) => {
        if (e.target.files?.length) onImport(e.target.files);
        e.target.value = '';
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        const mb = bytes / (1024 * 1024);
        return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
    };

    return (
        <div className="clip-bin">
            <input ref={fileRef} type="file" accept="video/*,audio/*" multiple style={{ display: 'none' }} onChange={handleImport} />
            <div className="clip-bin-header">
                <span className="clip-bin-title">Media Bin ({clips.length})</span>
                <button className="clip-bin-import" onClick={() => fileRef.current?.click()}>+ Import</button>
            </div>
            <div className="clip-bin-list">
                {clips.length === 0 && (
                    <div className="clip-bin-empty">Drop files here or click Import</div>
                )}
                {clips.map(clip => (
                    <div key={clip.id} className="clip-bin-item"
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData('clipId', clip.id);
                            e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onDoubleClick={() => onPreview?.(clip)}
                    >
                        <div className="clip-bin-thumb">
                            <video src={clip.url} muted preload="metadata" />
                            <span className="clip-bin-dur">{clip.durationStr}</span>
                        </div>
                        <div className="clip-bin-info">
                            <span className="clip-bin-name" title={clip.name}>{clip.name.length > 18 ? clip.name.slice(0, 16) + '...' : clip.name}</span>
                            <span className="clip-bin-meta">{clip.resolution} · {formatSize(clip.size)}</span>
                        </div>
                        <div className="clip-bin-actions">
                            <button className="clip-bin-add" onClick={() => onAddToTimeline(clip)} title="Add to Timeline">+</button>
                            <button className="clip-bin-remove" onClick={() => onRemove(clip.id)} title="Remove">×</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
