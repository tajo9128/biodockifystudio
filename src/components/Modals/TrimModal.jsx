import React, { useState, useRef, useEffect } from 'react';
import './TrimModal.css';

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.floor((seconds % 1) * 10).toString();
    return `${m}:${s}.${ms}`;
};

export const TrimModal = ({ blob, mimeType, onTrimmed, onCancel }) => {
    const [duration, setDuration] = useState(0);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [videoSrc, setVideoSrc] = useState(() => blob ? URL.createObjectURL(blob) : null);
    const videoRef = useRef(null);

    useEffect(() => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setVideoSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [blob]);

    const handleLoadedMetadata = () => {
        const video = videoRef.current;
        if (!video) return;
        setDuration(video.duration);
        setTrimEnd(video.duration);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handlePreview = (time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    const handleTrim = async () => {
        setIsProcessing(true);

        try {
            // Use canvas + MediaRecorder to re-encode trimmed portion
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            const stream = canvas.captureStream(30);
            const recorder = new MediaRecorder(stream, {
                mimeType: mimeType || 'video/webm;codecs=vp9',
                videoBitsPerSecond: 8000000
            });

            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            }

            return new Promise((resolve) => {
                recorder.onstop = () => {
                    const trimmedBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
                    setIsProcessing(false);
                    onTrimmed(trimmedBlob);
                    resolve();
                };

                recorder.start();
                video.currentTime = trimStart;

                video.onseeked = () => {
                    if (video.currentTime >= trimEnd) {
                        recorder.stop();
                        return;
                    }
                    ctx.drawImage(video, 0, 0);
                    requestAnimationFrame(() => {
                        video.currentTime += 1 / 30;
                    });
                };
            });
        } catch {
            setIsProcessing(false);
            // Fall through — just save full video
            onTrimmed(blob);
        }
    };

    if (!blob) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="trim-modal" onClick={e => e.stopPropagation()}>
                <div className="trim-header">
                    <h3>Trim Recording</h3>
                    <button className="btn-icon-bg" onClick={onCancel}>x</button>
                </div>

                <div className="trim-preview">
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        controls={false}
                        style={{ width: '100%', borderRadius: '8px', background: '#000' }}
                    />
                </div>

                <div className="trim-timeline">
                    <div className="trim-bar">
                        <div
                            className="trim-selection"
                            style={{
                                left: `${(trimStart / duration) * 100}%`,
                                width: `${((trimEnd - trimStart) / duration) * 100}%`
                            }}
                        />
                        <div
                            className="trim-handle trim-handle-start"
                            style={{ left: `${(trimStart / duration) * 100}%` }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const onMove = (ev) => {
                                    const rect = e.target.parentElement.getBoundingClientRect();
                                    const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                                    const newStart = Math.min(pct * duration, trimEnd - 0.5);
                                    setTrimStart(newStart);
                                    handlePreview(newStart);
                                };
                                const onUp = () => {
                                    window.removeEventListener('mousemove', onMove);
                                    window.removeEventListener('mouseup', onUp);
                                };
                                window.addEventListener('mousemove', onMove);
                                window.addEventListener('mouseup', onUp);
                            }}
                        />
                        <div
                            className="trim-handle trim-handle-end"
                            style={{ left: `${(trimEnd / duration) * 100}%` }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const onMove = (ev) => {
                                    const rect = e.target.parentElement.getBoundingClientRect();
                                    const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                                    const newEnd = Math.max(pct * duration, trimStart + 0.5);
                                    setTrimEnd(newEnd);
                                    handlePreview(newEnd);
                                };
                                const onUp = () => {
                                    window.removeEventListener('mousemove', onMove);
                                    window.removeEventListener('mouseup', onUp);
                                };
                                window.addEventListener('mousemove', onMove);
                                window.addEventListener('mouseup', onUp);
                            }}
                        />
                        <div
                            className="trim-playhead"
                            style={{ left: `${(currentTime / duration) * 100}%` }}
                        />
                    </div>
                    <div className="trim-times">
                        <span>{formatTime(trimStart)}</span>
                        <span className="trim-duration">
                            Selected: {formatTime(trimEnd - trimStart)}
                        </span>
                        <span>{formatTime(trimEnd)}</span>
                    </div>
                </div>

                <div className="trim-actions">
                    <button className="btn btn-outline" onClick={onCancel}>
                        Save Full
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleTrim}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing...' : 'Trim & Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
