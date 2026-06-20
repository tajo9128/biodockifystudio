import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStreams } from '../hooks/useStreams';
import { useRecording } from '../hooks/useRecording';
import { useAudioLevel } from '../hooks/useAudioLevel';
import { recordingStore } from '../utils/RecordingStore';
import { useAudioProcessor } from '../hooks/useAudioProcessor';
import { Toast } from './Notifications/Toast';
import { BACKGROUND_PRESETS } from '../constants/backgrounds';
import './ScreenRecorder.css';

const QUALITY_PRESETS = {
    'native': { width: null, height: null, bitrate: 15000000 },
    '720p': { width: 1280, height: 720, bitrate: 6000000 },
    '1080p': { width: 1920, height: 1080, bitrate: 12000000 },
    '1440p': { width: 2560, height: 1440, bitrate: 20000000 },
};

const RECORDING_TEMPLATES = [
    { id: 'screen-only', icon: '🖥️', label: 'Screen', desc: 'Screen recording only' },
    { id: 'camera-only', icon: '📷', label: 'Camera', desc: 'Webcam only' },
    { id: 'pip-circle', icon: '⭕', label: 'PiP Circle', desc: 'Screen + circle cam' },
    { id: 'pip-rect', icon: '📺', label: 'PiP Rect', desc: 'Screen + rectangle cam' },
    { id: 'side-by-side', icon: '⬛📷', label: 'Side by Side', desc: 'Screen left, cam right' },
    { id: 'stacked', icon: '📺📷', label: 'Stacked', desc: 'Screen top, cam bottom' },
];

const drawFit = (ctx, video, x, y, w, h) => {
    const va = video.videoWidth / video.videoHeight;
    const ca = w / h;
    let dw, dh;
    if (va > ca) { dw = w; dh = w / va; } else { dh = h; dw = h * va; }
    ctx.drawImage(video, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

const getPipPos = (cw, ch, camW, camH, pad, corner) => {
    switch (corner) {
        case 'tl': return { x: pad, y: pad };
        case 'tr': return { x: cw - camW - pad, y: pad };
        case 'bl': return { x: pad, y: ch - camH - pad };
        default:  return { x: cw - camW - pad, y: ch - camH - pad };
    }
};

const ScreenRecorder = () => {
    const canvasRef = useRef(null);
    const screenVideoRef = useRef(null);
    const cameraVideoRef = useRef(null);

    const [toast, setToast] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [recQuality, setRecQuality] = useState('1080p');
    const [enhancedAudio, setEnhancedAudio] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [micEnabled, setMicEnabled] = useState(false);
    const [activeBg, setActiveBg] = useState('none');
    const [directoryHandle, setDirectoryHandle] = useState(null);
    const [isStarting, setIsStarting] = useState(false);
    const [showCamPreview, setShowCamPreview] = useState(false);
    const [layoutTemplate, setLayoutTemplate] = useState('pip-circle');
    const [pipCorner, setPipCorner] = useState('br'); // tl, tr, bl, br
    const isStartingRef = useRef(false);
    const pipPosRef = useRef({ corner: 'br', x: 0, y: 0 });

    const { screenStream, audioStream, cameraStream, toggleScreen, toggleMic, toggleCamera, stopAll, screenDimensions } = useStreams(screenVideoRef, cameraVideoRef, () => {});
    const audioLevel = useAudioLevel(audioStream);
    const { processedStream } = useAudioProcessor(audioStream, enhancedAudio);

    const handleComplete = useCallback(async (blob, mimeType) => {
        if (!blob) {
            setToast({ title: 'Recording Failed', message: 'No video captured', type: 'error' });
            return;
        }
        recordingStore.set(blob, mimeType);

        const ext = '.webm';
        const name = `recording-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}${ext}`;
        const blobUrl = URL.createObjectURL(blob);

        try {
            // Try saving to folder first
            if (directoryHandle) {
                const fileHandle = await directoryHandle.getFileHandle(name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                setToast({ title: 'Saved', message: `Saved to ${directoryHandle.name}/${name}`, type: 'success' });
            } else {
                const a = document.createElement('a');
                a.href = blobUrl; a.download = name;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setToast({ title: 'Saved', message: 'Check your downloads folder', type: 'success' });
            }
        } catch {
            const a = document.createElement('a');
            a.href = blobUrl; a.download = name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setToast({ title: 'Saved', message: 'Download triggered', type: 'success' });
        }
    }, [directoryHandle]);

    const { isRecording, isPaused, status, startRecording, pauseRecording, resumeRecording, stopRecording } = useRecording({
        screenStream, audioStream: processedStream || audioStream, cameraStream,
        activeBg, screenScale: 1.0, canvasRef,
        recordingQuality: recQuality,
        bitrate: QUALITY_PRESETS[recQuality].bitrate,
        useCanvas: true,
        onComplete: handleComplete,
    });

    // Elapsed timer
    useEffect(() => {
        if (!isRecording) { setElapsedTime(0); return; }
        const iv = setInterval(() => setElapsedTime(t => t + 1), 1000);
        return () => clearInterval(iv);
    }, [isRecording]);

    // Cleanup on unmount
    useEffect(() => () => { stopAll(); }, []);

    // Prevent page close during recording
    useEffect(() => {
        if (!isRecording) return;
        const h = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [isRecording]);

    // Canvas sizing
    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;
        const q = QUALITY_PRESETS[recQuality];
        let w = q.width || screenDimensions.width || 1920;
        let h = q.height || screenDimensions.height || 1080;
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    }, [recQuality, screenDimensions]);

    // Update pip position ref when corner changes
    useEffect(() => { pipPosRef.current.corner = pipCorner; }, [pipCorner]);

    // Canvas render loop — supports all templates
    useEffect(() => {
        let running = true;
        const loop = () => {
            if (!running) return;
            const c = canvasRef.current;
            if (!c) { requestAnimationFrame(loop); return; }
            const ctx = c.getContext('2d', { alpha: false });
            const tpl = layoutTemplate;

            // Background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, c.width, c.height);

            const hasScreen = screenStream && screenVideoRef.current?.readyState >= 2 && tpl !== 'camera-only';
            const hasCamera = cameraStream && cameraVideoRef.current?.readyState >= 2 && tpl !== 'screen-only';

            if (tpl === 'screen-only' || tpl === 'camera-only') {
                // Single source full canvas
                const v = tpl === 'screen-only' ? screenVideoRef.current : cameraVideoRef.current;
                if (v?.readyState >= 2) drawFit(ctx, v, 0, 0, c.width, c.height);
            } else if (tpl === 'side-by-side') {
                const hw = c.width / 2;
                if (hasScreen) drawFit(ctx, screenVideoRef.current, 0, 0, hw, c.height);
                else { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, hw, c.height); }
                if (hasCamera) drawFit(ctx, cameraVideoRef.current, hw, 0, hw, c.height);
                else { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(hw, 0, hw, c.height); }
            } else if (tpl === 'stacked') {
                const hh = c.height / 2;
                if (hasScreen) drawFit(ctx, screenVideoRef.current, 0, 0, c.width, hh);
                else { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, c.width, hh); }
                if (hasCamera) drawFit(ctx, cameraVideoRef.current, 0, hh, c.width, hh);
                else { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, hh, c.width, hh); }
            } else {
                // PiP templates: screen full + camera overlay
                if (hasScreen) drawFit(ctx, screenVideoRef.current, 0, 0, c.width, c.height);
                if (hasCamera) {
                    const v = cameraVideoRef.current;
                    const camW = c.width * 0.25;
                    const camH = camW * (v.videoHeight / v.videoWidth);
                    const pad = 16;
                    const { x: cx, y: cy } = getPipPos(c.width, c.height, camW, camH, pad, pipCorner);
                    pipPosRef.current.x = cx; pipPosRef.current.y = cy;
                    ctx.save();
                    if (tpl === 'pip-circle') {
                        const radius = Math.max(camW, camH) / 2;
                        ctx.beginPath();
                        ctx.arc(cx + camW / 2, cy + camH / 2, radius, 0, Math.PI * 2);
                        ctx.clip();
                    }
                    drawFit(ctx, v, cx, cy, camW, camH);
                    ctx.restore();
                }
            }
            requestAnimationFrame(loop);
        };
        loop();
        return () => { running = false; };
    }, [screenStream, cameraStream, layoutTemplate, pipCorner]);

    // Keyboard
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space') { e.preventDefault(); if (isRecording) stopRecording(); else startFlow(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isRecording]);

    // === CORE FLOW: Start captures both screen + camera, saves to folder ===
    const startFlow = useCallback(async () => {
        if (isStartingRef.current || isRecording) return;
        isStartingRef.current = true;
        setIsStarting(true);

        try {
            const needsCam = ['pip-circle', 'pip-rect', 'side-by-side', 'stacked', 'camera-only'].includes(layoutTemplate);
            const needsScreen = layoutTemplate !== 'camera-only';

            // Capture screen if needed
            let gotScreen = true;
            if (needsScreen && !screenStream) {
                gotScreen = !!(await toggleScreen());
            }
            // Capture camera if template needs it
            let gotCam = true;
            if (needsCam && !cameraStream) {
                const stream = await toggleCamera();
                gotCam = !!stream;
                if (stream) { setCameraEnabled(true); setShowCamPreview(true); }
            }
            // Bail if nothing captured
            if (!gotScreen && !gotCam) {
                setIsStarting(false);
                isStartingRef.current = false;
                return;
            }
            // Auto-enable mic
            if (!audioStream) {
                await toggleMic().catch(() => {});
            }
            // Start recording with both streams
            setTimeout(() => {
                startRecording();
                setIsStarting(false);
                isStartingRef.current = false;
            }, 600);
        } catch {
            setIsStarting(false);
            isStartingRef.current = false;
        }
    }, [layoutTemplate, screenStream, cameraStream, audioStream, isRecording, toggleScreen, toggleCamera, toggleMic, startRecording]);

    const fmtTime = (s) => `${Math.floor(s/60).toString().padStart(2, '0')}:${(s%60).toString().padStart(2, '0')}`;

    // Select workspace folder
    const selectFolder = useCallback(async () => {
        try {
            const handle = await window.showDirectoryPicker();
            setDirectoryHandle(handle);
            import('../utils/StorageManager').then(m => m.storageManager)
                .then(sm => sm.setSetting('workspace_handle', handle));
            setToast({ title: 'Folder Selected', message: `Saves to: ${handle.name}`, type: 'success' });
        } catch {
            // User cancelled
        }
    }, []);

    // Try restore folder
    useEffect(() => {
        import('../utils/StorageManager').then(m => m.storageManager).then(sm => {
            sm.getSetting('workspace_handle').then(h => { if (h) setDirectoryHandle(h); }).catch(() => {});
        }).catch(() => {});
    }, []);

    return (
        <div className="recorder-page">
            {/* Preview */}
            <div className={`recorder-preview ${isRecording ? 'recording' : ''}`}>
                <canvas ref={canvasRef} className="recorder-canvas" />
                {/* Camera preview overlay when camera active but screen not active */}
                {!screenStream && cameraStream && !isStarting && (
                    <video ref={cameraVideoRef} className="recorder-cam-preview" autoPlay muted playsInline />
                )}
                {!screenStream && !cameraStream && !isStarting && (
                    <div className="recorder-start-screen">
                        <div className="recorder-sources">
                            <button className={`recorder-source-card ${screenStream ? 'active' : ''}`}
                                onClick={async () => {
                                    const stream = await toggleScreen();
                                    if (stream) { setCameraEnabled(false); }
                                }}>
                                <span className="source-icon">🖥️</span>
                                <span className="source-label">Screen</span>
                                <span className={`source-status ${screenStream ? 'on' : 'off'}`}>
                                    {screenStream ? '🔓 Active' : '🔒 Click to enable'}
                                </span>
                            </button>
                            <button className={`recorder-source-card ${cameraStream ? 'active' : ''}`}
                                onClick={async () => {
                                    const stream = await toggleCamera();
                                    if (stream) { setCameraEnabled(true); setShowCamPreview(true); }
                                    else { setCameraEnabled(false); setShowCamPreview(false); }
                                }}>
                                <span className="source-icon">📷</span>
                                <span className="source-label">Camera</span>
                                <span className={`source-status ${cameraStream ? 'on' : 'off'}`}>
                                    {cameraStream ? '🔓 Active' : '🔒 Click to enable'}
                                </span>
                            </button>
                            <button className={`recorder-source-card ${audioStream ? 'active' : ''}`}
                                onClick={async () => {
                                    const stream = await toggleMic();
                                    if (stream) { setMicEnabled(true); } else { setMicEnabled(false); }
                                }}>
                                <span className="source-icon">🎤</span>
                                <span className="source-label">Microphone</span>
                                <span className={`source-status ${audioStream ? 'on' : 'off'}`}>
                                    {audioStream ? (
                                        <span className="mic-test-bar">
                                            <span className="mic-test-fill" style={{ width: `${Math.min(audioLevel * 100, 100)}%` }} />
                                        </span>
                                    ) : '🔒 Click to enable'}
                                </span>
                            </button>
                        </div>
                        {/* Template selector */}
                        <div className="recorder-templates">
                            <span className="template-label">Recording Layout</span>
                            <div className="template-options">
                                {RECORDING_TEMPLATES.map(t => (
                                    <button key={t.id}
                                        className={`template-btn ${layoutTemplate === t.id ? 'selected' : ''}`}
                                        onClick={() => setLayoutTemplate(t.id)}
                                        title={t.desc}>
                                        <span className="template-icon">{t.icon}</span>
                                        <span className="template-name">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                            {(layoutTemplate === 'pip-circle' || layoutTemplate === 'pip-rect') && (
                                <div className="pip-corners">
                                    <span className="template-label">Webcam Position</span>
                                    <div className="corner-options">
                                        {[
                                            { id: 'tl', label: '↖ Top Left' },
                                            { id: 'tr', label: '↗ Top Right' },
                                            { id: 'bl', label: '↙ Bot Left' },
                                            { id: 'br', label: '↘ Bot Right' },
                                        ].map(c => (
                                            <button key={c.id}
                                                className={`corner-btn ${pipCorner === c.id ? 'selected' : ''}`}
                                                onClick={() => setPipCorner(c.id)}>
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="recorder-start-btn" onClick={startFlow} disabled={isStarting || (!screenStream && !cameraStream)}>
                            {isStarting ? 'Opening Screen Picker...' : (screenStream || cameraStream) ? 'Start Recording' : 'Enable Screen or Camera to start'}
                        </button>
                        <p className="recorder-hint">or press <kbd>Space</kbd></p>
                        {directoryHandle && (
                            <p className="recorder-folder-info">
                                📁 Saves to: {directoryHandle.name}
                            </p>
                        )}
                    </div>
                )}
                {/* Source toggles + settings when screen/camera are active, not recording */}
                {!isRecording && (screenStream || cameraStream) && (
                    <div className="recorder-overlay-controls">
                        <div className="recorder-mini-sources">
                            <button className={`recorder-mini-ctrl ${audioStream ? 'active' : ''}`}
                                onClick={async () => {
                                    const stream = await toggleMic();
                                    if (stream) { setMicEnabled(true); } else { setMicEnabled(false); }
                                }} title={audioStream ? 'Mic On - Click to mute' : 'Mic Off - Click to enable'}>
                                🎤 {audioStream ? 'ON' : 'OFF'}
                            </button>
                            <button className={`recorder-mini-ctrl ${cameraStream ? 'active' : ''}`}
                                onClick={async () => {
                                    const stream = await toggleCamera();
                                    if (stream) { setCameraEnabled(true); setShowCamPreview(true); }
                                    else { setCameraEnabled(false); setShowCamPreview(false); }
                                }} title={cameraStream ? 'Camera On' : 'Camera Off'}>
                                📷 {cameraStream ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div className="recorder-mini-settings">
                            <select className="recorder-mini-ctrl" value={recQuality} onChange={e => setRecQuality(e.target.value)}>
                                <option value="720p">720p</option>
                                <option value="1080p">1080p</option>
                                <option value="1440p">1440p</option>
                                <option value="native">Native</option>
                            </select>
                            <button className="recorder-mini-ctrl" onClick={selectFolder}>
                                📁 {directoryHandle ? directoryHandle.name : 'Folder'}
                            </button>
                            <button className="recorder-mini-ctrl" onClick={startFlow} disabled={isStarting}
                                style={{ background: '#ef4444', color: 'white', border: 'none', fontWeight: 700 }}>
                                {isStarting ? '...' : 'REC'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Recording bar */}
            {isRecording && (
                <div className="recorder-bar">
                    <div className="recorder-bar-left">
                        <span className="recorder-rec-dot" />
                        <span className="recorder-timer">{fmtTime(elapsedTime)}</span>
                        <span className="recorder-q">· {recQuality} · ~{Math.round(elapsedTime * QUALITY_PRESETS[recQuality].bitrate / 8000000)} MB</span>
                    </div>
                    <div className="recorder-bar-center">
                        {isPaused ? (
                            <button className="recorder-btn-play" onClick={resumeRecording}>Resume</button>
                        ) : (
                            <button className="recorder-btn-pause" onClick={pauseRecording}>Pause</button>
                        )}
                        <button className="recorder-btn-stop" onClick={stopRecording}>Stop Recording</button>
                    </div>
                    <div className="recorder-bar-right">
                        <button className={`recorder-mini-ctrl ${cameraStream ? 'active' : ''}`}
                            onClick={async () => {
                                const stream = await toggleCamera();
                                if (stream) { setCameraEnabled(true); } else { setCameraEnabled(false); }
                            }}>
                            📷 {cameraStream ? 'ON' : 'OFF'}
                        </button>
                        <button className={`recorder-mini-ctrl ${audioStream ? 'active' : ''}`}
                            onClick={async () => {
                                const stream = await toggleMic();
                                if (stream) { setMicEnabled(true); } else { setMicEnabled(false); }
                            }}>
                            🎤 {audioStream ? 'ON' : 'OFF'}
                        </button>
                        {audioStream && (
                            <div className="recorder-audio-level">
                                <div className="recorder-audio-fill" style={{ width: `${Math.min(audioLevel * 100, 100)}%` }} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
};

export default ScreenRecorder;
