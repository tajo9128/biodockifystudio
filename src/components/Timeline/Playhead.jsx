import React, { useState, useCallback, useEffect } from 'react';
import './Playhead.css';

const TIME_SCALE_BASE = 80;
const SNAP_THRESHOLD_PX = 3;

export const Playhead = ({
    currentTime,
    zoom,
    clips,
    markers,
    duration,
    onSeek,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    const getSnapPoints = useCallback(() => {
        const points = [0, duration];
        clips.forEach(c => {
            points.push(c.startTime, c.startTime + c.duration);
        });
        markers.forEach(m => {
            points.push(m.time);
        });
        return points;
    }, [clips, markers, duration]);

    const snapToNearest = useCallback((time) => {
        const snapPoints = getSnapPoints();
        const snapPx = SNAP_THRESHOLD_PX / timeScale;
        let nearest = time;
        let minDist = Infinity;
        for (const pt of snapPoints) {
            const dist = Math.abs(pt - time);
            if (dist < minDist && dist < snapPx) {
                minDist = dist;
                nearest = pt;
            }
        }
        return nearest;
    }, [getSnapPoints, timeScale]);

    const handleMouseDown = useCallback((e) => {
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e) => {
            const scrollEl = document.querySelector('.tl-scroll');
            if (!scrollEl) return;
            const rect = scrollEl.getBoundingClientRect();
            const x = e.clientX - rect.left + scrollEl.scrollLeft;
            const rawTime = Math.max(0, xToTime(x));
            const snappedTime = snapToNearest(rawTime);
            onSeek(snappedTime);
        };
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, xToTime, snapToNearest, onSeek]);

    const x = timeToX(currentTime);

    return (
        <div
            className={`tl-playhead ${isDragging ? 'tl-playhead-dragging' : ''}`}
            style={{ left: x }}
            onMouseDown={handleMouseDown}
        >
            <div className="tl-playhead-head" />
            <div className="tl-playhead-line" />
        </div>
    );
};
