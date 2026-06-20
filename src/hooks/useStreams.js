import { useState, useCallback } from 'react';
import { mediaManager } from '../utils/MediaManager';

export const useStreams = (screenVideoRef, cameraVideoRef, setStatus) => {
    const [screenStream, setScreenStream] = useState(null);
    const [audioStream, setAudioStream] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);
    const [systemAudioStream, setSystemAudioStream] = useState(null);
    const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 });
    const [cameraDimensions, setCameraDimensions] = useState({ width: 0, height: 0 });
    const [sourceType, setSourceType] = useState('screen');

    const stopAll = useCallback(() => {
        [screenStream, cameraStream, audioStream, systemAudioStream].forEach(s => mediaManager.stopStream(s));
        setScreenStream(null); setCameraStream(null); setAudioStream(null); setSystemAudioStream(null);
        setScreenDimensions({ width: 0, height: 0 }); setCameraDimensions({ width: 0, height: 0 });
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
        setStatus('idle');
    }, [screenStream, cameraStream, audioStream, systemAudioStream, screenVideoRef, cameraVideoRef, setStatus]);

    const toggleScreen = async () => {
        if (screenStream) { mediaManager.stopStream(screenStream); setScreenStream(null); setScreenDimensions({ width: 0, height: 0 }); if (screenVideoRef.current) screenVideoRef.current.srcObject = null; return null; }
        try {
            const stream = await mediaManager.getScreenStream();
            const track = stream.getVideoTracks()[0];
            const s = track.getSettings();
            setScreenDimensions({ width: s.width || 1920, height: s.height || 1080 });
            setScreenStream(stream);
            if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
            screenVideoRef.current?.play().catch(() => {});
            track.onended = () => { setScreenStream(null); setScreenDimensions({ width: 0, height: 0 }); if (screenVideoRef.current) screenVideoRef.current.srcObject = null; };
            setStatus('ready');
            return stream;
        } catch (err) { return null; }
    };

    const toggleSystemAudio = async () => {
        if (systemAudioStream) { mediaManager.stopStream(systemAudioStream); setSystemAudioStream(null); return null; }
        try { const stream = await mediaManager.getSystemAudio(); if (stream) setSystemAudioStream(stream); return stream; }
        catch { return null; }
    };

    const toggleMic = async () => {
        if (audioStream) {
            if (audioStream === cameraStream) { setAudioStream(null); return null; }
            mediaManager.stopStream(audioStream);
            setAudioStream(null);
            return null;
        }
        // If camera is already on with audio, just enable mic from camera stream
        if (cameraStream && cameraStream.getAudioTracks().length > 0) {
            setAudioStream(cameraStream);
            return cameraStream;
        }
        try {
            const stream = await mediaManager.getAudioStream();
            setAudioStream(stream);
            setStatus('ready');
            return stream;
        } catch (err) { return null; }
    };

    const toggleCamera = async () => {
        if (cameraStream) {
            const wasShared = audioStream === cameraStream;
            mediaManager.stopStream(cameraStream);
            setCameraStream(null);
            setCameraDimensions({ width: 0, height: 0 });
            if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
            if (wasShared) setAudioStream(null);
            return null;
        }
        try {
            // Combine camera + mic into ONE stream to stay under browser's 3-stream limit
            const stream = await mediaManager.getCameraStream(!audioStream);
            const videoTrack = stream.getVideoTracks()[0];
            const s = videoTrack.getSettings();
            setCameraDimensions({ width: s.width || 1280, height: s.height || 720 });
            setCameraStream(stream);
            if (!audioStream && stream.getAudioTracks().length > 0) setAudioStream(stream);
            if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
            cameraVideoRef.current?.play().catch(() => {});
            setStatus('ready');
            return stream;
        } catch (err) { return null; }
    };

    const changeCamera = async (deviceId) => { if (cameraStream) { mediaManager.stopStream(cameraStream); setCameraStream(null); } return await toggleCamera(); };
    const changeMic = async () => { if (audioStream) { mediaManager.stopStream(audioStream); setAudioStream(null); } return await toggleMic(); };

    return { screenStream, audioStream, cameraStream, systemAudioStream, screenDimensions, cameraDimensions, sourceType, setSourceType, toggleScreen, toggleSystemAudio, toggleMic, toggleCamera, stopAll, changeCamera, changeMic };
};
