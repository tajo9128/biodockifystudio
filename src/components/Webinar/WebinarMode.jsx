import React, { useState, useRef, useEffect } from 'react';
import { useScenes } from '../../hooks/useScenes';
import { useStreams } from '../../hooks/useStreams';
import { useRecording } from '../../hooks/useRecording';
import { useStreaming } from '../../hooks/useStreaming';
import { useReplayBuffer } from '../../hooks/useReplayBuffer';
import { SceneSwitcher } from '../Scenes/SceneSwitcher';
import { StreamPanel } from '../Streaming/StreamPanel';
import { MixerPanel } from '../Audio/MixerPanel';
import { renderTitleTemplate } from '../../utils/TitleTemplates';
import './WebinarMode.css';

export const WebinarMode = () => {
    const canvasRef = useRef(null);
    const screenVideoRef = useRef(null);
    const cameraVideoRef = useRef(null);
    const [showStreamPanel, setShowStreamPanel] = useState(false);
    const [showMixer, setShowMixer] = useState(false);
    const [showLowerThird, setShowLowerThird] = useState(true);
    const [lowerThirdName, setLowerThirdName] = useState('Speaker Name');
    const [lowerThirdTitle, setLowerThirdTitle] = useState('Title / Role');
    const [showQna, setShowQna] = useState(false);

    const scenes = useScenes();
    const streams = useStreams(screenVideoRef, cameraVideoRef, () => {});
    const recording = useRecording({
        screenStream: streams?.screenStream,
        audioStream: streams?.audioStream,
        cameraStream: streams?.cameraStream,
        canvasRef,
        useCanvas: true,
    });
    const streaming = useStreaming();
    const replay = useReplayBuffer();

    // Auto-set first scene active so MixerPanel works
    useEffect(() => {
        if (!scenes.activeSceneId && scenes.scenes.length > 0) {
            scenes.setActiveSceneId(scenes.scenes[0].id);
        }
    }, [scenes.activeSceneId, scenes.scenes]);

    // Cleanup streams on unmount
    const activeRef = useRef(false);
    useEffect(() => { activeRef.current = recording.isRecording || streaming.isStreaming; });
    useEffect(() => {
        return () => {
            if (!activeRef.current) streams.stopAll?.();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Guard against accidental page close during streaming/recording
    useEffect(() => {
        const active = recording.isRecording || streaming.isStreaming;
        if (!active) return;
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [recording.isRecording, streaming.isStreaming]);

    // Render loop — use refs to avoid restarting every render
    const scenesRef = useRef(scenes);
    const streamsRef = useRef(streams);
    const ltRef = useRef({ show: showLowerThird, name: lowerThirdName, title: lowerThirdTitle, showQna });
    useEffect(() => {
        scenesRef.current = scenes;
        streamsRef.current = streams;
        ltRef.current = { show: showLowerThird, name: lowerThirdName, title: lowerThirdTitle, showQna };
    });

    useEffect(() => {
        let running = true;
        const loop = () => {
            if (!running) return;
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const s = scenesRef.current;
                s.renderScene(ctx, canvas, s.activeScene, streamsRef.current);

                const lt = ltRef.current;
                if (lt.show && (lt.name || lt.title)) {
                    renderTitleTemplate('lowerThird', ctx, canvas, {
                        name: lt.name,
                        title: lt.title,
                    });
                }
            }
            requestAnimationFrame(loop);
        };
        loop();
        return () => { running = false; };
    }, []);

    return (
        <div className="webinar-mode">
            {/* Scene Switcher */}
            <SceneSwitcher
                scenes={scenes.scenes}
                activeSceneId={scenes.activeSceneId}
                onSelectScene={scenes.setActiveSceneId}
                onAddScene={scenes.addScene}
            />

            <div className="webinar-main">
                {/* Canvas Preview */}
                <div className="webinar-preview">
                    <canvas
                        ref={canvasRef}
                        width={1920}
                        height={1080}
                        className="webinar-canvas"
                    />

                    {/* Lower Third Config */}
                    {showLowerThird && (
                        <div className="webinar-lower-third-config">
                            <input
                                className="webinar-lt-input"
                                value={lowerThirdName}
                                onChange={e => setLowerThirdName(e.target.value)}
                                placeholder="Name"
                            />
                            <input
                                className="webinar-lt-input"
                                value={lowerThirdTitle}
                                onChange={e => setLowerThirdTitle(e.target.value)}
                                placeholder="Title"
                            />
                        </div>
                    )}
                </div>

                {/* Webinar Controls */}
                <div className="webinar-controls">
                    <div className="webinar-controls-left">
                        <button
                            className={`webinar-btn ${showLowerThird ? 'active' : ''}`}
                            onClick={() => setShowLowerThird(!showLowerThird)}
                        >
                            Lower Third
                        </button>
                        <button
                            className={`webinar-btn ${showQna ? 'active' : ''}`}
                            onClick={() => setShowQna(!showQna)}
                        >
                            Q&A
                        </button>
                        <button
                            className={`webinar-btn ${showMixer ? 'active' : ''}`}
                            onClick={() => setShowMixer(!showMixer)}
                        >
                            Mixer
                        </button>
                    </div>

                    <div className="webinar-controls-center">
                        {recording.isRecording ? (
                            <button className="webinar-record-btn recording" onClick={recording.stopRecording}>
                                Stop Recording
                            </button>
                        ) : (
                            <button className="webinar-record-btn" onClick={() => recording.startRecording()}>
                                Record
                            </button>
                        )}

                        {streaming.isStreaming ? (
                            <button className="webinar-stream-btn streaming" onClick={streaming.stopStream}>
                                End Stream
                            </button>
                        ) : (
                            <button className="webinar-stream-btn" onClick={() => setShowStreamPanel(true)}>
                                Go Live
                            </button>
                        )}

                        {replay.isBuffering && (
                            <button className="webinar-replay-btn" onClick={replay.saveReplay}>
                                Save Replay
                            </button>
                        )}
                    </div>

                    <div className="webinar-controls-right">
                        {streaming.isStreaming && (
                            <div className="webinar-live-indicator">
                                <span className="webinar-live-dot" />
                                LIVE ({Math.floor(streaming.streamStats.uptime / 60)}:{String(Math.floor(streaming.streamStats.uptime % 60)).padStart(2, '0')})
                            </div>
                        )}
                        {recording.isRecording && (
                            <div className="webinar-rec-indicator">
                                <span className="webinar-rec-dot" />
                                REC
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stream Panel */}
            <StreamPanel
                isOpen={showStreamPanel}
                onClose={() => setShowStreamPanel(false)}
                isStreaming={streaming.isStreaming}
                isConnecting={streaming.isConnecting}
                streamError={streaming.streamError}
                streamStats={streaming.streamStats}
                platform={streaming.platform}
                selectPlatform={streaming.selectPlatform}
                streamKey={streaming.streamKey}
                setStreamKey={streaming.setStreamKey}
                rtmpUrl={streaming.rtmpUrl}
                setRtmpUrl={streaming.setRtmpUrl}
                relayUrl={streaming.relayUrl}
                setRelayUrl={streaming.setRelayUrl}
                resolution={streaming.resolution}
                setResolution={streaming.setResolution}
                bitrate={streaming.bitrate}
                setBitrate={streaming.setBitrate}
                onStartStream={streaming.startStream}
                onStopStream={streaming.stopStream}
                onCheckRelay={streaming.checkRelay}
                canvasRef={canvasRef}
                audioStream={streams.audioStream}
            />

            {/* Mixer Panel */}
            <MixerPanel
                isOpen={showMixer}
                onClose={() => setShowMixer(false)}
                scenes={scenes.scenes}
                activeSceneId={scenes.activeSceneId}
                onUpdateSource={scenes.updateSource}
            />
        </div>
    );
};
