import React, { useState, useCallback } from 'react';
import './TransitionHandles.css';

const TIME_SCALE_BASE = 80;
const TRANSITION_DURATION = 1.0;

export const TransitionHandles = ({
    clips,
    tracks,
    zoom,
    trackHeight,
    onApplyTransition,
    onRemoveTransition,
}) => {
    const [hoveredGap, setHoveredGap] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);

    const findAdjacentPairs = useCallback(() => {
        const pairs = [];
        const trackClips = {};
        clips.forEach(clip => {
            if (!trackClips[clip.trackIndex]) trackClips[clip.trackIndex] = [];
            trackClips[clip.trackIndex].push(clip);
        });
        for (const [, tc] of Object.entries(trackClips)) {
            tc.sort((a, b) => a.startTime - b.startTime);
            for (let i = 0; i < tc.length - 1; i++) {
                const clipA = tc[i];
                const clipB = tc[i + 1];
                const gap = clipB.startTime - (clipA.startTime + clipA.duration);
                if (Math.abs(gap) < TRANSITION_DURATION * 2) {
                    pairs.push({
                        id: `${clipA.id}-${clipB.id}`,
                        clipA,
                        clipB,
                        gap,
                        midpoint: clipA.startTime + clipA.duration + gap / 2,
                    });
                }
            }
        }
        return pairs;
    }, [clips]);

    const pairs = findAdjacentPairs();

    const handleDragOver = (e, pair) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(pair.id);
    };

    const handleDrop = (e, pair) => {
        e.preventDefault();
        setDragOver(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'transition') {
                onApplyTransition?.(pair.clipA.id, pair.clipB.id, data.id);
            }
        } catch {}
    };

    return (
        <div className="tl-transition-handles">
            {pairs.map(pair => {
                const x = timeToX(pair.midpoint);
                const hasTransition = pair.clipA.transitions?.out || pair.clipB.transitions?.in;
                return (
                    <div key={pair.id}
                        className={`tl-transition-zone ${dragOver === pair.id ? 'tl-transition-dragover' : ''} ${hasTransition ? 'tl-transition-active' : ''}`}
                        style={{ left: x - 12, width: 24, top: pair.clipA.trackIndex * trackHeight }}
                        onMouseEnter={() => setHoveredGap(pair.id)}
                        onMouseLeave={() => setHoveredGap(null)}
                        onDragOver={(e) => handleDragOver(e, pair)}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => handleDrop(e, pair)}
                        onClick={() => { if (hasTransition) onRemoveTransition?.(pair.clipA.id); }}>
                        <div className="tl-transition-icon">{hasTransition ? '◆' : '◇'}</div>
                        {hoveredGap === pair.id && !hasTransition && (
                            <div className="tl-transition-tooltip">Drop transition here</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
