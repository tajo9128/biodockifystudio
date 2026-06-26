import React, { useRef, useEffect, useState } from 'react';
import { extractWaveform } from '../../utils/WaveformExtractor';
import './WaveformCanvas.css';

export const WaveformCanvas = ({
    clip,
    zoom,
    height = 40,
    color = '#10b981',
    backgroundColor = 'rgba(16, 185, 129, 0.1)',
}) => {
    const canvasRef = useRef(null);
    const [peaks, setPeaks] = useState(null);

    useEffect(() => {
        const url = clip.sourceUrl || (clip._fileRef ? URL.createObjectURL(clip._fileRef) : null);
        if (!url || clip.type !== 'audio') return;

        let cancelled = false;
        extractWaveform(url, 300).then(data => {
            if (!cancelled) setPeaks(data);
        });
        return () => { cancelled = true; };
    }, [clip.sourceUrl, clip._fileRef, clip.type]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !peaks) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const zoomFactor = Math.min(zoom, 4);
        const barWidth = Math.max(1, w / peaks.length);
        const centerY = h / 2;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
        ctx.globalAlpha = 1;

        for (let i = 0; i < peaks.length; i++) {
            const x = i * barWidth;
            const peakHeight = peaks[i] * centerY * zoomFactor;
            const clampedHeight = Math.min(peakHeight, centerY - 1);

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7 + peaks[i] * 0.3;
            ctx.fillRect(x, centerY - clampedHeight, barWidth - 0.5, clampedHeight);
            ctx.fillRect(x, centerY, barWidth - 0.5, clampedHeight);
        }

        ctx.globalAlpha = 1;
    }, [peaks, zoom, color, backgroundColor]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.parentElement?.offsetWidth || 200;
            canvas.height = height;
        });
        observer.observe(canvas.parentElement);
        return () => observer.disconnect();
    }, [height]);

    return (
        <canvas
            ref={canvasRef}
            className="tl-waveform-canvas"
            style={{ height }}
        />
    );
};
