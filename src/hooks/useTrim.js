import { useState, useCallback, useRef } from 'react';

export const useTrim = () => {
    const [isTrimming, setIsTrimming] = useState(false);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoRef = useRef(null);
    const videoUrlRef = useRef(null);

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
            videoUrlRef.current = url;
        };
    }, []);

    const cancelTrim = useCallback(() => {
        setIsTrimming(false);
        setTrimStart(0);
        setTrimEnd(0);
        if (videoUrlRef.current) {
            URL.revokeObjectURL(videoUrlRef.current);
            videoUrlRef.current = null;
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

        // Extract and trim audio from the original blob
        const audioTrack = await getTrimmedAudioTrack(originalBlob, trimStart, trimEnd);

        const stream = canvas.captureStream(30);
        if (audioTrack) stream.addTrack(audioTrack);

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
                if (videoUrlRef.current) {
                    URL.revokeObjectURL(videoUrlRef.current);
                    videoUrlRef.current = null;
                }
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

// Extract audio from blob, trim to time range, return as MediaStreamTrack
async function getTrimmedAudioTrack(blob, startTime, endTime) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const sampleRate = audioBuffer.sampleRate;
        const channels = audioBuffer.numberOfChannels;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.min(Math.floor(endTime * sampleRate), audioBuffer.length);
        const length = Math.max(0, endSample - startSample);

        if (length <= 0) return null;

        // Create trimmed audio buffer
        const trimmed = audioCtx.createBuffer(channels, length, sampleRate);
        for (let ch = 0; ch < channels; ch++) {
            const src = audioBuffer.getChannelData(ch);
            const dst = trimmed.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                dst[i] = src[startSample + i];
            }
        }

        // Create a source and destination to get a MediaStreamTrack
        const source = audioCtx.createBufferSource();
        source.buffer = trimmed;
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.start();

        const track = dest.stream.getAudioTracks()[0];
        return track || null;
    } catch {
        return null;
    }
}
