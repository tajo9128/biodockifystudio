import { useState, useCallback, useRef, useEffect } from 'react';

export const useTrim = () => {
    const [isTrimming, setIsTrimming] = useState(false);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const startTrim = useCallback((blob) => {
        const url = URL.createObjectURL(blob);
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;

        video.onloadedmetadata = () => {
            setDuration(video.duration);
            setTrimStart(0);
            setTrimEnd(video.duration);
            setIsTrimming(true);
            videoRef.current = video;
        };
    }, []);

    const cancelTrim = useCallback(() => {
        setIsTrimming(false);
        setTrimStart(0);
        setTrimEnd(0);
        if (videoRef.current?.src) {
            URL.revokeObjectURL(blob.current);
        }
        videoRef.current = null;
    }, []);

    const executeTrim = useCallback(async (originalBlob, mimeType) => {
        if (!videoRef.current) return originalBlob;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(30);
        const audioTracks = originalBlob ? await getAudioTracks(originalBlob) : [];
        audioTracks.forEach(t => stream.addTrack(t));

        const recorder = new MediaRecorder(stream, {
            mimeType: mimeType || 'video/webm;codecs=vp9',
            videoBitsPerSecond: 8000000
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        return new Promise((resolve) => {
            recorder.onstop = () => {
                const trimmedBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
                setIsTrimming(false);
                videoRef.current = null;
                resolve(trimmedBlob);
            };

            recorder.start();

            video.currentTime = trimStart;
            video.onseeked = () => {
                const drawFrame = () => {
                    if (video.currentTime >= trimEnd || video.ended) {
                        recorder.stop();
                        return;
                    }
                    ctx.drawImage(video, 0, 0);
                    video.currentTime += 1 / 30;
                };

                video.onseeked = () => {
                    drawFrame();
                };

                drawFrame();
            };
        });
    }, [trimStart, trimEnd]);

    const getAudioTracks = async (blob) => {
        try {
            const url = URL.createObjectURL(blob);
            const audio = document.createElement('audio');
            audio.src = url;
            await audio.play().catch(() => {});
            audio.pause();
            URL.revokeObjectURL(url);
        } catch {}
        return [];
    };

    return {
        isTrimming,
        trimStart,
        setTrimStart,
        trimEnd,
        setTrimEnd,
        duration,
        startTrim,
        cancelTrim,
        executeTrim
    };
};
