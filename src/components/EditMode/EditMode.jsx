import React, { useState, useRef, useCallback } from 'react';
import { ToolSidebar } from '../Sidebar/ToolSidebar';
import { RightPanel } from '../RightPanel/RightPanel';
import { PreviewStage } from '../Preview/PreviewStage';
import { Timeline } from '../Timeline/Timeline';
import { AIAssistant } from '../AI/AIAssistant';
import { useTimeline } from '../../hooks/useTimeline';
import { useAnnotation } from '../../hooks/useAnnotation';
import { useCursorFx } from '../../hooks/useCursorFx';
import { useZoom } from '../../hooks/useZoom';
import { useAI } from '../../hooks/useAI';
import { useOverlays } from '../../hooks/useOverlays';
import { useStreams } from '../../hooks/useStreams';
import { useRecording } from '../../hooks/useRecording';
import { useAudioLevel } from '../../hooks/useAudioLevel';
import { BACKGROUND_PRESETS } from '../../constants/backgrounds';
import './EditMode.css';

export const EditMode = () => {
    const canvasRef = useRef(null);
    const screenVideoRef = useRef(null);
    const cameraVideoRef = useRef(null);

    const [activeTool, setActiveTool] = useState(null);
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState([]);
    const [cursorFxEnabled, setCursorFxEnabled] = useState(false);
    const [annotationEnabled, setAnnotationEnabled] = useState(false);
    const [zoomEnabled, setZoomEnabled] = useState(false);
    const [activeBg, setActiveBg] = useState('none');
    const [webcamShape, setWebcamShape] = useState('circle');
    const [webcamScale, setWebcamScale] = useState(0.25);
    const [screenScale, setScreenScale] = useState(1.0);
    const [aiOpen, setAiOpen] = useState(false);

    const timeline = useTimeline();
    const annotation = useAnnotation(canvasRef, annotationEnabled);
    const { drawCursorFx } = useCursorFx(canvasRef, cursorFxEnabled);
    const { applyZoom, restoreZoom } = useZoom(canvasRef, zoomEnabled);
    const ai = useAI();
    const overlays = useOverlays();
    const streams = useStreams();
    const recording = useRecording();
    const audioLevel = useAudioLevel(streams.audioStream);

    const selectedClip = timeline.clips.find(c => c.id === timeline.selectedClipId);

    const handleToolChange = useCallback((tool) => {
        setActiveTool(tool);
        if (tool && ['filter', 'transition', 'keyframe', 'text'].includes(tool)) {
            setRightPanelOpen(true);
        } else if (!tool) {
            setRightPanelOpen(false);
        }
        // Handle annotation toggle
        if (tool === 'draw') setAnnotationEnabled(true);
        else setAnnotationEnabled(false);
    }, []);

    const handleAICommand = useCallback((command) => {
        // Execute AI commands using timeline
        if (command.action === 'split') timeline.splitAtPlayhead();
        else if (command.action === 'delete' && command.clipId) timeline.removeClip(command.clipId);
        // Add more command handlers as needed
    }, [timeline]);

    return (
        <div className="edit-mode">
            <div className="edit-mode-main">
                <ToolSidebar activeTool={activeTool} onToolChange={handleToolChange} />

                <div className="edit-mode-canvas">
                    <PreviewStage
                        canvasRef={canvasRef}
                        screenVideoRef={screenVideoRef}
                        cameraVideoRef={cameraVideoRef}
                        screenStream={streams.screenStream}
                        cameraStream={streams.cameraStream}
                        activeBg={activeBg}
                        webcamShape={webcamShape}
                        webcamScale={webcamScale}
                        screenScale={screenScale}
                        isRecording={recording.isRecording}
                        isPaused={recording.isPaused}
                        webcamOnly={false}
                        cursorFxEnabled={cursorFxEnabled}
                        drawCursorFx={drawCursorFx}
                        annotationEnabled={annotationEnabled}
                        annotationHandlers={annotationEnabled ? {
                            onMouseDown: annotation.handleMouseDown,
                            onMouseMove: annotation.handleMouseMove,
                            onMouseUp: annotation.handleMouseUp,
                        } : null}
                        zoomEnabled={zoomEnabled}
                        applyZoom={applyZoom}
                        restoreZoom={restoreZoom}
                    />
                </div>

                <RightPanel
                    isOpen={rightPanelOpen}
                    onClose={() => { setRightPanelOpen(false); setActiveTool(null); }}
                    activeTool={activeTool}
                    selectedClip={selectedClip}
                    onUpdateClip={timeline.updateClip}
                    activeFilters={activeFilters}
                    setActiveFilters={setActiveFilters}
                    keyframes={selectedClip?.keyframes}
                    onAddKeyframe={timeline.addKeyframe}
                    onRemoveKeyframe={timeline.removeKeyframe}
                />
            </div>

            <div className="edit-mode-timeline">
                <Timeline
                    clips={timeline.clips}
                    tracks={timeline.tracks}
                    currentTime={timeline.currentTime}
                    duration={timeline.duration}
                    selectedClipId={timeline.selectedClipId}
                    isPlaying={timeline.isPlaying}
                    zoom={timeline.zoom}
                    onSelectClip={timeline.setSelectedClipId}
                    onSeek={timeline.seek}
                    onSplit={timeline.splitAtPlayhead}
                    onDelete={timeline.removeClip}
                    onMove={timeline.moveClip}
                    onResize={timeline.resizeClip}
                    onPlay={timeline.play}
                    onPause={timeline.pause}
                    onStop={timeline.stop}
                    onZoomChange={timeline.setZoom}
                />
            </div>

            <AIAssistant
                isOpen={aiOpen}
                onToggle={() => setAiOpen(!aiOpen)}
                messages={ai.messages}
                isProcessing={ai.isProcessing}
                onSend={ai.sendMessage}
                onClear={ai.clearMessages}
                ollamaConnected={ai.ollamaConnected}
                ollamaModel={ai.ollamaModel}
                ollamaModels={ai.ollamaModels}
                onCheckOllama={ai.checkOllama}
                apiKey={ai.apiKey}
                onApiKeyChange={ai.setApiKey}
            />
        </div>
    );
};
