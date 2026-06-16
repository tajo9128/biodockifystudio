import { useState, useRef, useCallback, useEffect } from 'react';

// Smart auto-zoom — follows cursor activity on canvas
// When cursor stays in one area, smoothly zoom in. When it moves, smoothly follow.
export const useSmartZoom = (canvasRef, enabled = false, sensitivity = 'medium') => {
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const targetZoomRef = useRef(1.0);
    const targetPanRef = useRef({ x: 0, y: 0 });
    const cursorHistoryRef = useRef([]);
    const rafRef = useRef(null);

    const maxZoom = sensitivity === 'fast' ? 2.5 : sensitivity === 'slow' ? 1.5 : 2.0;
    const sampleWindow = sensitivity === 'fast' ? 1500 : sensitivity === 'slow' ? 4000 : 2500;

    useEffect(() => {
        if (!enabled) {
            targetZoomRef.current = 1.0;
            targetPanRef.current = { x: 0, y: 0 };
            cursorHistoryRef.current = [];
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            cursorHistoryRef.current.push({ x, y, t: Date.now() });

            // Trim old entries
            const cutoff = Date.now() - sampleWindow;
            while (cursorHistoryRef.current.length > 0 && cursorHistoryRef.current[0].t < cutoff) {
                cursorHistoryRef.current.shift();
            }

            // Analyze cursor cluster
            const history = cursorHistoryRef.current;
            if (history.length < 5) return;

            // Calculate bounding box of recent cursor positions
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            let avgX = 0, avgY = 0;
            for (const p of history) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
                avgX += p.x;
                avgY += p.y;
            }
            avgX /= history.length;
            avgY /= history.length;

            const boxW = maxX - minX;
            const boxH = maxY - minY;
            const boxSize = Math.max(boxW, boxH);

            // If cursor is clustered in a small area, zoom in
            if (boxSize < 0.3 && history.length > 10) {
                const zoom = Math.min(maxZoom, 1 / Math.max(boxSize * 1.5, 0.2));
                targetZoomRef.current = zoom;
                // Pan towards cursor center
                const panX = (avgX - 0.5) * (1 - 1 / zoom);
                const panY = (avgY - 0.5) * (1 - 1 / zoom);
                targetPanRef.current = { x: panX, y: panY };
            } else if (boxSize > 0.6) {
                // Cursor spread across screen — zoom out
                targetZoomRef.current = 1.0;
                targetPanRef.current = { x: 0, y: 0 };
            }
        };

        canvas.addEventListener('mousemove', onMouseMove);

        // Smooth interpolation loop
        const animate = () => {
            setZoomLevel(prev => {
                const target = targetZoomRef.current;
                const diff = target - prev;
                if (Math.abs(diff) < 0.01) return target;
                return prev + diff * 0.05; // smooth interpolation
            });
            setPanOffset(prev => {
                const target = targetPanRef.current;
                return {
                    x: prev.x + (target.x - prev.x) * 0.05,
                    y: prev.y + (target.y - prev.y) * 0.05,
                };
            });
            rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);

        return () => {
            canvas.removeEventListener('mousemove', onMouseMove);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [canvasRef, enabled, maxZoom, sampleWindow]);

    const reset = useCallback(() => {
        targetZoomRef.current = 1.0;
        targetPanRef.current = { x: 0, y: 0 };
        cursorHistoryRef.current = [];
        setZoomLevel(1.0);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    return { zoomLevel, panOffset, reset };
};
