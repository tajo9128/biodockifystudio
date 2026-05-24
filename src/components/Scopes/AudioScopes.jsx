import React, { useRef, useEffect } from 'react';
import './AudioScopes.css';

// Waveform scope — real-time audio waveform visualization
export const WaveformScope = ({ analyserNode, width = 300, height = 120 }) => {
    const canvasRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        if (!analyserNode || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animRef.current = requestAnimationFrame(draw);
            analyserNode.getByteTimeDomainData(dataArray);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, width, height);

            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#8b5cf6';
            ctx.beginPath();

            const sliceWidth = width / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * height) / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.lineTo(width, height / 2);
            ctx.stroke();
        };

        draw();
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [analyserNode, width, height]);

    return (
        <div className="scope-container">
            <div className="scope-label">Waveform</div>
            <canvas ref={canvasRef} width={width} height={height} className="scope-canvas" />
        </div>
    );
};

// Frequency spectrum — bar graph of frequency bands
export const SpectrumScope = ({ analyserNode, width = 300, height = 120 }) => {
    const canvasRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        if (!analyserNode || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animRef.current = requestAnimationFrame(draw);
            analyserNode.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, width, height);

            const barCount = 64;
            const barWidth = width / barCount;
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
                const value = dataArray[i * step];
                const barHeight = (value / 255) * height;
                const hue = (i / barCount) * 270; // purple → blue gradient
                ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
                ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
            }
        };

        draw();
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [analyserNode, width, height]);

    return (
        <div className="scope-container">
            <div className="scope-label">Spectrum</div>
            <canvas ref={canvasRef} width={width} height={height} className="scope-canvas" />
        </div>
    );
};

// Histogram — pixel luminance distribution (video scope)
export const HistogramScope = ({ canvasRef, width = 300, height = 120 }) => {
    const scopeCanvasRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        if (!canvasRef?.current || !scopeCanvasRef.current) return;
        const scopeCanvas = scopeCanvasRef.current;
        const ctx = scopeCanvas.getContext('2d');

        const draw = () => {
            animRef.current = requestAnimationFrame(draw);
            const source = canvasRef.current;
            if (!source) return;

            const sctx = source.getContext('2d');
            const imageData = sctx.getImageData(0, 0, source.width, source.height);
            const data = imageData.data;
            const bins = new Uint32Array(256);

            for (let i = 0; i < data.length; i += 4) {
                const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
                bins[lum]++;
            }

            const maxBin = Math.max(...bins);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, width, height);

            const barWidth = width / 256;
            for (let i = 0; i < 256; i++) {
                const barHeight = (bins[i] / maxBin) * height;
                const alpha = 0.5 + (i / 256) * 0.5;
                ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
                ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
            }
        };

        draw();
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [canvasRef, width, height]);

    return (
        <div className="scope-container">
            <div className="scope-label">Histogram</div>
            <canvas ref={scopeCanvasRef} width={width} height={height} className="scope-canvas" />
        </div>
    );
};

// Scopes panel — holds all scopes
export const ScopesPanel = ({ isOpen, onClose, analyserNode, previewCanvasRef }) => {
    if (!isOpen) return null;

    return (
        <div className="scopes-panel">
            <div className="scopes-header">
                <h3>Scopes</h3>
                <button className="btn-icon-bg" onClick={onClose}>x</button>
            </div>
            <div className="scopes-body">
                {analyserNode && <WaveformScope analyserNode={analyserNode} />}
                {analyserNode && <SpectrumScope analyserNode={analyserNode} />}
                {previewCanvasRef && <HistogramScope canvasRef={previewCanvasRef} />}
            </div>
        </div>
    );
};
