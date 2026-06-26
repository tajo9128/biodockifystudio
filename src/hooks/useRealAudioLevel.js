import { useState, useRef, useEffect } from 'react';

export const useRealAudioLevel = (audioStream) => {
    const [level, setLevel] = useState(0);
    const [peaks, setPeaks] = useState({ left: 0, right: 0 });
    const contextRef = useRef(null);
    const analyserRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        if (!audioStream) {
            setLevel(0);
            return;
        }

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        contextRef.current = ctx;
        const source = ctx.createMediaStreamSource(audioStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length) / 255;
            setLevel(rms);

            setPeaks(prev => ({
                left: Math.max(prev.left * 0.99, rms),
                right: Math.max(prev.right * 0.99, rms * 0.95),
            }));

            animRef.current = requestAnimationFrame(tick);
        };

        animRef.current = requestAnimationFrame(tick);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            source.disconnect();
            ctx.close();
        };
    }, [audioStream]);

    return { level, peaks };
};
