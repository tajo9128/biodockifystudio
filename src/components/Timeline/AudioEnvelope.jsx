import React, { useRef, useEffect, useCallback, useState } from 'react';
import './AudioEnvelope.css';

const ENVELOPE_HEIGHT = 32;

export const AudioEnvelope = ({
    clip,
    zoom,
    onAddVolumeKeyframe,
    onRemoveVolumeKeyframe,
    onMoveVolumeKeyframe,
}) => {
    const svgRef = useRef(null);
    const [dragging, setDragging] = useState(null);
    const timeScale = 80 * zoom;

    const volumeKeyframes = clip.keyframes?.volume || [];
    const clipWidth = clip.duration * timeScale;

    const getY = (volume) => {
        const normalized = 1 - (volume / 2);
        return normalized * ENVELOPE_HEIGHT;
    };

    const getTime = (x) => (x / clipWidth) * clip.duration;
    const getX = (time) => (time / clip.duration) * clipWidth;

    const buildPath = () => {
        if (volumeKeyframes.length === 0) {
            const y = getY(1.0);
            return `M 0 ${y} L ${clipWidth} ${y}`;
        }

        const sorted = [...volumeKeyframes].sort((a, b) => a.time - b.time);
        let d = '';

        if (sorted[0].time > 0) {
            d += `M 0 ${getY(1.0)} `;
        }

        for (let i = 0; i < sorted.length; i++) {
            const x = getX(sorted[i].time);
            const y = getY(sorted[i].value);
            d += (i === 0 ? 'M ' : 'L ') + `${x} ${y} `;
        }

        if (sorted[sorted.length - 1].time < clip.duration) {
            d += `L ${clipWidth} ${getY(sorted[sorted.length - 1].value)}`;
        }

        return d;
    };

    const handleDoubleClick = useCallback((e) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = getTime(x);
        onAddVolumeKeyframe?.(clip.id, time, 1.0);
    }, [clip, onAddVolumeKeyframe]);

    const handlePointMouseDown = useCallback((e, kf) => {
        e.stopPropagation();
        setDragging({ time: kf.time, startY: e.clientY, startValue: kf.value });
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e) => {
            const dy = dragging.startY - e.clientY;
            const newVolume = Math.max(0, Math.min(2, dragging.startValue + (dy / ENVELOPE_HEIGHT) * 2));
            onMoveVolumeKeyframe?.(clip.id, dragging.time, newVolume);
        };
        const handleMouseUp = () => setDragging(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, clip.id, onMoveVolumeKeyframe]);

    return (
        <svg
            ref={svgRef}
            className="tl-audio-envelope"
            width={clipWidth}
            height={ENVELOPE_HEIGHT}
            onDoubleClick={handleDoubleClick}
        >
            <path
                d={`${buildPath()} L ${clipWidth} ${ENVELOPE_HEIGHT} L 0 ${ENVELOPE_HEIGHT} Z`}
                fill="rgba(139, 92, 246, 0.1)"
            />
            <path
                d={buildPath()}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeLinecap="round"
            />
            {volumeKeyframes.map((kf, i) => (
                <circle
                    key={i}
                    cx={getX(kf.time)}
                    cy={getY(kf.value)}
                    r="4"
                    fill="#8b5cf6"
                    stroke="#fff"
                    strokeWidth="1.5"
                    className="tl-envelope-point"
                    onMouseDown={(e) => handlePointMouseDown(e, kf)}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        onRemoveVolumeKeyframe?.(clip.id, 'volume', kf.time);
                    }}
                />
            ))}
        </svg>
    );
};
