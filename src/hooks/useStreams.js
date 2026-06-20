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
        if (audioStream) { mediaManager.stopStream(audioStream); setAudioStream(null); return null; }
        try {
            const stream = await mediaManager.getAudioStream();
            setAudioStream(stream);
            setStatus('ready');
            return stream;
        } catch (err) { return null; }
    };

    const toggleCamera = async () => {
        if (cameraStream) { mediaManager.stopStream(cameraStream); setCameraStream(null); setCameraDimensions({ width: 0, height: 0 }); if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null; return null; }
        try {
            const stream = await mediaManager.getCameraStream();
            const track = stream.getVideoTracks()[0];
            const s = track.getSettings();
            setCameraDimensions({ width: s.width || 1280, height: s.height || 720 });
            setCameraStream(stream);
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
