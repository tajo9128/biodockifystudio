import React from 'react';
import { RealAudioMeter } from './RealAudioMeter';
import './MixerPanel.css';

export const MixerPanel = ({ isOpen, onClose, scenes, activeSceneId, onUpdateSource, audioStream }) => {
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
                            audioStream={audioStream}
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

const MixerChannel = ({ source, audioStream, onVolumeChange, onMuteToggle }) => {
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
            <RealAudioMeter
                audioStream={audioStream}
                label=""
            />
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
