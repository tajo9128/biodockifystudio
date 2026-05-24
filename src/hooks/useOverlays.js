import { useState, useCallback } from 'react';

let overlayIdCounter = 0;

export const useOverlays = () => {
    const [overlays, setOverlays] = useState([]);
    const [selectedOverlayId, setSelectedOverlayId] = useState(null);

    const addTextOverlay = useCallback((text, x, y, options = {}) => {
        const id = `overlay_${++overlayIdCounter}`;
        const overlay = {
            id,
            type: 'text',
            text,
            x, y,
            fontFamily: options.fontFamily || 'Outfit, sans-serif',
            fontSize: options.fontSize || 32,
            fontWeight: options.fontWeight || 'bold',
            color: options.color || '#ffffff',
            backgroundColor: options.backgroundColor || 'transparent',
            opacity: options.opacity ?? 1,
            fadeIn: options.fadeIn || 0,
            fadeOut: options.fadeOut || 0,
            startTime: options.startTime || 0,
            duration: options.duration || 5,
            rotation: options.rotation || 0,
            shadow: options.shadow ?? true,
        };
        setOverlays(prev => [...prev, overlay]);
        setSelectedOverlayId(id);
        return id;
    }, []);

    const removeOverlay = useCallback((id) => {
        setOverlays(prev => prev.filter(o => o.id !== id));
        if (selectedOverlayId === id) setSelectedOverlayId(null);
    }, [selectedOverlayId]);

    const updateOverlay = useCallback((id, updates) => {
        setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    }, []);

    const clearOverlays = useCallback(() => {
        setOverlays([]);
        setSelectedOverlayId(null);
    }, []);

    const drawOverlays = useCallback((ctx, currentTime) => {
        overlays.forEach(overlay => {
            if (currentTime < overlay.startTime || currentTime > overlay.startTime + overlay.duration) return;

            ctx.save();

            let alpha = overlay.opacity;
            const elapsed = currentTime - overlay.startTime;
            if (overlay.fadeIn > 0 && elapsed < overlay.fadeIn) {
                alpha *= elapsed / overlay.fadeIn;
            }
            const remaining = overlay.startTime + overlay.duration - currentTime;
            if (overlay.fadeOut > 0 && remaining < overlay.fadeOut) {
                alpha *= remaining / overlay.fadeOut;
            }
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

            if (overlay.rotation) {
                ctx.translate(overlay.x, overlay.y);
                ctx.rotate(overlay.rotation * Math.PI / 180);
                ctx.translate(-overlay.x, -overlay.y);
            }

            if (overlay.type === 'text') {
                ctx.font = `${overlay.fontWeight} ${overlay.fontSize}px ${overlay.fontFamily}`;
                ctx.textBaseline = 'top';

                const metrics = ctx.measureText(overlay.text);
                const textWidth = metrics.width;
                const textHeight = overlay.fontSize * 1.3;

                if (overlay.backgroundColor && overlay.backgroundColor !== 'transparent') {
                    ctx.fillStyle = overlay.backgroundColor;
                    const pad = 8;
                    ctx.beginPath();
                    ctx.roundRect(overlay.x - pad, overlay.y - pad, textWidth + pad * 2, textHeight + pad * 2, 8);
                    ctx.fill();
                }

                if (overlay.shadow) {
                    ctx.shadowColor = 'rgba(0,0,0,0.7)';
                    ctx.shadowBlur = 6;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                }

                ctx.fillStyle = overlay.color;
                ctx.fillText(overlay.text, overlay.x, overlay.y);
            }

            ctx.restore();
        });
    }, [overlays]);

    const selectedOverlay = overlays.find(o => o.id === selectedOverlayId) || null;

    return {
        overlays,
        selectedOverlayId,
        selectedOverlay,
        setSelectedOverlayId,
        addTextOverlay,
        removeOverlay,
        updateOverlay,
        clearOverlays,
        drawOverlays,
    };
};
