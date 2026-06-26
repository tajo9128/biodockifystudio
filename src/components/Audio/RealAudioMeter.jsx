import React from 'react';
import { useRealAudioLevel } from '../../hooks/useRealAudioLevel';
import './RealAudioMeter.css';

export const RealAudioMeter = ({ audioStream, label = 'Mic' }) => {
    const { level, peaks } = useRealAudioLevel(audioStream);

    const getLevelClass = (l) => {
        if (l > 0.9) return 'clipping';
        if (l > 0.7) return 'hot';
        if (l > 0.4) return 'good';
        return 'low';
    };

    return (
        <div className="real-audio-meter">
            <span className="real-audio-meter__label">{label}</span>
            <div className="real-audio-meter__bars">
                <div className="real-audio-meter__bar-container">
                    <div
                        className={`real-audio-meter__fill ${getLevelClass(level)}`}
                        style={{ width: `${Math.min(level * 100, 100)}%` }}
                    />
                    <div
                        className="real-audio-meter__peak"
                        style={{ left: `${Math.min(peaks.left * 100, 100)}%` }}
                    />
                </div>
            </div>
            <span className="real-audio-meter__db">
                {level > 0 ? `-${Math.round((1 - level) * 60)}` : '-inf'}
            </span>
        </div>
    );
};
