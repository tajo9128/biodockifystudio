import { useState, useCallback, useRef, useEffect } from 'react';

export const useAudioProcessor = (rawAudioStream, enabled = true) => {
    const [processedStream, setProcessedStream] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const ctxRef = useRef(null);
    const sourceRef = useRef(null);
    const destRef = useRef(null);

    useEffect(() => {
        if (!rawAudioStream || !enabled) {
            setProcessedStream(rawAudioStream);
            setIsActive(false);
            return;
        }

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

            const source = audioCtx.createMediaStreamSource(rawAudioStream);

            // High-pass filter — removes low-frequency rumble (fans, AC, desk vibrations)
            const highpass = audioCtx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 85;
            highpass.Q.value = 0.7;

            // Compressor — auto-levels loud and quiet sounds
            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // Low-pass filter — removes high-frequency hiss
            const lowpass = audioCtx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 16000;

            // Output destination
            const dest = audioCtx.createMediaStreamDestination();

            // Connect chain: source → highpass → compressor → lowpass → dest
            source.connect(highpass);
            highpass.connect(compressor);
            compressor.connect(lowpass);
            lowpass.connect(dest);

            ctxRef.current = audioCtx;
            sourceRef.current = source;
            destRef.current = dest;

            setProcessedStream(dest.stream);
            setIsActive(true);
        } catch (err) {
            console.warn('Audio processor init failed, using raw stream:', err.message);
            setProcessedStream(rawAudioStream);
            setIsActive(false);
        }

        return () => {
            if (ctxRef.current) {
                ctxRef.current.close().catch(() => {});
                ctxRef.current = null;
            }
        };
    }, [rawAudioStream, enabled]);

    const toggle = useCallback(() => {
        setIsActive(prev => !prev);
    }, []);

    return { processedStream, isActive, toggle };
};
