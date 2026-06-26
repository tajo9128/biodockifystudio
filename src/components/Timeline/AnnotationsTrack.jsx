import React, { useState, useCallback, useEffect } from 'react';
import './AnnotationsTrack.css';

const TIME_SCALE_BASE = 80;
const CALLOUT_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export const AnnotationsTrack = ({
    annotations,
    zoom,
    trackHeight,
    onAddAnnotation,
    onUpdateAnnotation,
    onRemoveAnnotation,
}) => {
    const [dragging, setDragging] = useState(null);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    const handleTrackClick = useCallback((e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, xToTime(x));
        const color = CALLOUT_COLORS[Math.floor(Math.random() * CALLOUT_COLORS.length)];
        onAddAnnotation?.({ startTime: time, duration: 3, type: 'text', text: 'Callout', color, x: 0.5, y: 0.5, fontSize: 24 });
    }, [xToTime, onAddAnnotation]);

    const handleMouseDown = useCallback((e, ann, side) => {
        e.stopPropagation();
        if (side === 'left') {
            setDragging({ id: ann.id, side: 'left', startX: e.clientX, origStart: ann.startTime, origDuration: ann.duration });
        } else if (side === 'right') {
            setDragging({ id: ann.id, side: 'right', startX: e.clientX, origStart: ann.startTime, origDuration: ann.duration });
        } else {
            setDragging({ id: ann.id, side: 'move', startX: e.clientX, origStart: ann.startTime });
        }
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e) => {
            const dx = e.clientX - dragging.startX;
            const dt = dx / timeScale;
            if (dragging.side === 'move') {
                onUpdateAnnotation?.(dragging.id, { startTime: Math.max(0, dragging.origStart + dt) });
            } else if (dragging.side === 'left') {
                onUpdateAnnotation?.(dragging.id, { startTime: Math.max(0, dragging.origStart + dt), duration: Math.max(0.5, dragging.origDuration - dt) });
            } else if (dragging.side === 'right') {
                onUpdateAnnotation?.(dragging.id, { duration: Math.max(0.5, dragging.origDuration + dt) });
            }
        };
        const handleMouseUp = () => setDragging(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, timeScale, onUpdateAnnotation]);

    return (
        <div className="tl-annotations-track" style={{ height: trackHeight }} onClick={handleTrackClick}>
            {annotations.map(ann => (
                <div key={ann.id} className={`tl-annotation-block tl-annotation-${ann.type}`}
                    style={{ left: timeToX(ann.startTime), width: Math.max(timeToX(ann.duration), 20), backgroundColor: ann.color || '#f59e0b' }}
                    onMouseDown={(e) => handleMouseDown(e, ann, null)}
                    onDoubleClick={(e) => { e.stopPropagation(); onRemoveAnnotation?.(ann.id); }}>
                    <div className="tl-annotation-handle tl-annotation-handle-left" onMouseDown={(e) => handleMouseDown(e, ann, 'left')} />
                    <div className="tl-annotation-content">
                        <span className="tl-annotation-type">{ann.type}</span>
                        <span className="tl-annotation-text">{ann.text || ''}</span>
                    </div>
                    <div className="tl-annotation-handle tl-annotation-handle-right" onMouseDown={(e) => handleMouseDown(e, ann, 'right')} />
                </div>
            ))}
        </div>
    );
};
