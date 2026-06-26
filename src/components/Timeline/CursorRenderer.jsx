import React, { useRef, useEffect, useCallback } from 'react';
import { useTimelineStore } from '../../store/timelineStore';
import './CursorRenderer.css';

export const CursorRenderer = ({ videoRef, canvasWidth, canvasHeight }) => {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const cursorTelemetry = useTimelineStore(s => s.cursorTelemetry);
    const cursorSettings = useTimelineStore(s => s.cursorSettings);
    const currentTime = useTimelineStore(s => s.currentTime);
    const isPlaying = useTimelineStore(s => s.isPlaying);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !cursorTelemetry) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const timeMs = currentTime * 1000;

        const pos = cursorTelemetry.getPositionAt(timeMs);
        if (!pos) return;

        const cx = pos.x * canvas.width;
        const cy = pos.y * canvas.height;

        if (cursorSettings.spotlight) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'destination-out';
            const gradient = ctx.createRadialGradient(
                cx, cy, 0,
                cx, cy, cursorSettings.spotlightRadius
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        if (cursorSettings.highlight) {
            ctx.beginPath();
            ctx.arc(cx, cy, cursorSettings.highlightRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        if (cursorSettings.magnify && videoRef?.current) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, cursorSettings.magnifyRadius, 0, Math.PI * 2);
            ctx.clip();

            const magSize = cursorSettings.magnifyRadius * 2;
            const zoom = cursorSettings.magnifyZoom;
            ctx.drawImage(
                videoRef.current,
                pos.x * canvasWidth - magSize / zoom,
                pos.y * canvasHeight - magSize / zoom,
                magSize / zoom,
                magSize / zoom,
                cx - magSize / 2,
                cy - magSize / 2,
                magSize,
                magSize
            );
            ctx.restore();

            ctx.beginPath();
            ctx.arc(cx, cy, cursorSettings.magnifyRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (cursorSettings.clickRipples) {
            const clicks = cursorTelemetry.getClicks();
            for (const click of clicks) {
                const age = (timeMs - click.t) / 600;
                if (age < 0 || age > 1) continue;

                const clickX = click.x * canvas.width;
                const clickY = click.y * canvas.height;
                const radius = 10 + age * 40;
                const opacity = 1 - age;

                ctx.beginPath();
                ctx.arc(clickX, clickY, radius, 0, Math.PI * 2);
                const hexOpacity = Math.round(opacity * 200).toString(16).padStart(2, '0');
                ctx.strokeStyle = `${cursorSettings.clickColor}${hexOpacity}`;
                ctx.lineWidth = 2.5 - age * 2;
                ctx.stroke();
            }
        }
    }, [cursorTelemetry, cursorSettings, currentTime, videoRef, canvasWidth, canvasHeight]);

    useEffect(() => {
        if (isPlaying) {
            const loop = () => {
                draw();
                animRef.current = requestAnimationFrame(loop);
            };
            animRef.current = requestAnimationFrame(loop);
            return () => cancelAnimationFrame(animRef.current);
        } else {
            draw();
        }
    }, [isPlaying, draw]);

    return (
        <canvas
            ref={canvasRef}
            className="tl-cursor-renderer"
            width={canvasWidth}
            height={canvasHeight}
        />
    );
};
