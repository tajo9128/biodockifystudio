import { useState, useCallback, useRef, useEffect } from 'react';

export const useZoom = (canvasRef, enabled) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const zoomLevelRef = useRef(zoomLevel);
    useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);
    const isPanning = useRef(false);
    const lastPanPos = useRef({ x: 0, y: 0 });

    // Scroll wheel zoom
    useEffect(() => {
        if (!enabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e) => {
            e.preventDefault();
            setZoomLevel(prev => {
                const delta = e.deltaY > 0 ? -0.2 : 0.2;
                return Math.max(1, Math.min(5, prev + delta));
            });
        };

        const onDblClick = () => {
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
        };

        const onMouseDown = (e) => {
            if (zoomLevelRef.current > 1) {
                isPanning.current = true;
                lastPanPos.current = { x: e.clientX, y: e.clientY };
            }
        };

        const onMouseMove = (e) => {
            if (!isPanning.current) return;
            const dx = e.clientX - lastPanPos.current.x;
            const dy = e.clientY - lastPanPos.current.y;
            lastPanPos.current = { x: e.clientX, y: e.clientY };
            setPanOffset(prev => ({
                x: prev.x + dx,
                y: prev.y + dy,
            }));
        };

        const onMouseUp = () => {
            isPanning.current = false;
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('dblclick', onDblClick);
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('dblclick', onDblClick);
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [canvasRef, enabled]);

    // Reset when disabled
    useEffect(() => {
        if (!enabled) {
            setZoomLevel(prev => prev !== 1 ? 1 : prev);
            setPanOffset(prev => (prev.x !== 0 || prev.y !== 0) ? { x: 0, y: 0 } : prev);
        }
    }, [enabled]);

    const applyZoom = useCallback((ctx, canvasWidth, canvasHeight) => {
        if (!enabled || zoomLevelRef.current <= 1) return;

        ctx.save();
        ctx.translate(canvasWidth / 2 + panOffset.x, canvasHeight / 2 + panOffset.y);
        ctx.scale(zoomLevelRef.current, zoomLevelRef.current);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
    }, [enabled, panOffset]);

    const restoreZoom = useCallback((ctx) => {
        if (!enabled || zoomLevelRef.current <= 1) return;
        ctx.restore();
    }, [enabled]);

    return {
        zoomLevel,
        panOffset,
        applyZoom,
        restoreZoom,
        setZoomLevel,
        setPanOffset,
    };
};