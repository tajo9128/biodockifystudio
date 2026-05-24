import React, { useRef, useEffect, useState } from 'react';
import './MixerPanel.css';

export const MixerPanel = ({ isOpen, onClose, scenes, activeSceneId, onUpdateSource }) => {
    const activeScene = scenes?.find(s => s.id === activeSceneId);
    if (!isOpen || !activeScene) return null;

    const audioSources = activeScene.sources.filter(s => s.audio?.enabled);

    return (
        <div className="mixer-panel">
            <div className="mixer-header">
                <h3>Audio Mixer</h3>
                <button className="btn-icon-bg" onClick={onClose}>x</button>
            </div>
            <div className="mixer-body">
                {audioSources.length === 0 ? (
                    <div className="mixer-empty">No audio sources in this scene</div>
                ) : (
                    audioSources.map(source => (
                        <MixerChannel
                            key={source.id}
                            source={source}
                            onVolumeChange={(vol) => onUpdateSource?.(activeSceneId, source.id, { audio: { ...source.audio, volume: vol } })}
                            onMuteToggle={() => onUpdateSource?.(activeSceneId, source.id, { audio: { ...source.audio, muted: !source.audio?.muted } })}
                        />
                    ))
                )}
                {/* Master */}
                <div className="mixer-channel mixer-master">
                    <span className="mixer-channel-label">Master</span>
                    <div className="mixer-meter">
                        <div className="mixer-meter-fill" style={{ width: '70%' }} />
                    </div>
                    <span className="mixer-channel-value">100%</span>
                </div>
            </div>
        </div>
    );
};

const MixerChannel = ({ source, onVolumeChange, onMuteToggle }) => {
    const [level, setLevel] = useState(0);
    const animRef = useRef(null);

    // Simulate level meter animation
    useEffect(() => {
        if (source.audio?.muted) return;
        const tick = () => {
            setLevel(Math.random() * (source.audio?.volume || 100));
            animRef.current = requestAnimationFrame(tick);
        };
        tick();
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [source.audio?.volume, source.audio?.muted]);

    return (
        <div className={`mixer-channel ${source.audio?.muted ? 'muted' : ''}`}>
            <div className="mixer-channel-top">
                <span className="mixer-channel-label" title={source.name}>{source.name}</span>
                <button
                    className={`mixer-mute-btn ${source.audio?.muted ? 'active' : ''}`}
                    onClick={onMuteToggle}
                    title={source.audio?.muted ? 'Unmute' : 'Mute'}
                >
                    {source.audio?.muted ? 'M' : 'M'}
                </button>
            </div>
            <div className="mixer-meter">
                <div className="mixer-meter-fill" style={{
                    width: `${source.audio?.muted ? 0 : level}%`,
                    background: level > 90 ? '#ef4444' : level > 70 ? '#f59e0b' : '#10b981',
                }} />
                <div className="mixer-meter-peak" style={{ left: `${level}%` }} />
            </div>
            <input
                type="range"
                className="mixer-slider"
                min={0}
                max={150}
                value={source.audio?.volume ?? 100}
                onChange={e => onVolumeChange(parseInt(e.target.value))}
            />
            <span className="mixer-channel-value">{source.audio?.volume ?? 100}%</span>
        </div>
    );
};
