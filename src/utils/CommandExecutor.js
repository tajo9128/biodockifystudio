// CommandExecutor — maps AI commands to actual ScreenStudio operations
export class CommandExecutor {
    constructor(setters) {
        this.setters = setters;
    }

    execute(command) {
        if (!command || !command.action) return;

        switch (command.action) {
            case 'trim': {
                // Wire to actual trim: open trim modal with pre-set values
                if (this.setters.startTrim) {
                    this.setters.startTrim({ start: command.start || 0, end: command.end });
                } else {
                    this.setters.showToast?.('Trim', `Trimming from ${command.start || 0}s to ${command.end}s — use the Trim button in toolbar`, 'info');
                }
                break;
            }
            case 'trim_end': {
                if (this.setters.startTrim) {
                    this.setters.startTrim({ trimEnd: command.seconds });
                } else {
                    this.setters.showToast?.('Trim', `Trimming last ${command.seconds}s — use the Trim button`, 'info');
                }
                break;
            }

            case 'zoom':
                this.setters.setZoomEnabled?.(true);
                this.setters.showToast?.('Zoom', `Zoom ${command.level || 3}x at ${command.time}s for ${command.duration}s`, 'success');
                break;

            case 'title':
            case 'title_card': {
                // Add a title overlay to the current clip
                if (this.setters.addOverlay) {
                    this.setters.addOverlay({
                        text: command.text || 'Title',
                        x: 50, y: 50,
                        fontSize: 36,
                        fontFamily: 'Outfit, sans-serif',
                        color: '#ffffff',
                        backgroundColor: 'transparent',
                        startTime: command.position === 'end' ? -3 : 0,
                        duration: command.duration || 3,
                    });
                }
                this.setters.showToast?.('Title', `Title: "${command.text}" for ${command.duration}s`, 'success');
                break;
            }

            case 'add_text': {
                if (this.setters.addOverlay) {
                    this.setters.addOverlay({
                        text: command.text || 'Text',
                        x: command.x || 50,
                        y: command.y || 50,
                        fontSize: command.fontSize || 24,
                        fontFamily: 'Outfit, sans-serif',
                        color: command.color || '#ffffff',
                        backgroundColor: 'transparent',
                        startTime: command.time || 0,
                        duration: command.duration || 5,
                    });
                }
                this.setters.showToast?.('Text', `Added: "${command.text}"`, 'success');
                break;
            }

            case 'apply_filter': {
                const filterType = command.filter;
                const params = command.params || {};
                if (this.setters.addFilter) {
                    this.setters.addFilter({ filterId: filterType, params });
                }
                this.setters.showToast?.('Filter', `Applied ${filterType}`, 'success');
                break;
            }

            case 'remove_filter': {
                if (command.filter && this.setters.removeFilterByName) {
                    this.setters.removeFilterByName(command.filter);
                } else if (command.index !== undefined && this.setters.removeFilter) {
                    this.setters.removeFilter(command.index);
                }
                this.setters.showToast?.('Filter', `Removed ${command.filter || 'filter'}`, 'success');
                break;
            }

            case 'set_speed': {
                const speed = Math.max(0.25, Math.min(4, command.speed || 1));
                if (this.setters.setClipSpeed && this.setters.selectedClipId) {
                    this.setters.setClipSpeed(this.setters.selectedClipId, speed);
                }
                this.setters.showToast?.('Speed', `Set to ${speed}x`, 'success');
                break;
            }

            case 'add_transition': {
                if (this.setters.addTransition) {
                    this.setters.addTransition(command.type || 'crossfade', command.duration || 1);
                }
                this.setters.showToast?.('Transition', `Added ${command.type || 'crossfade'} transition`, 'success');
                break;
            }

            case 'switch_scene': {
                if (this.setters.switchScene) {
                    this.setters.switchScene(command.scene);
                }
                this.setters.showToast?.('Scene', `Switching to "${command.scene}"`, 'success');
                break;
            }

            case 'export_gif':
                this.setters.showToast?.('GIF Export', 'GIF export coming soon', 'info');
                break;

            case 'transcribe': {
                if (this.setters.startTranscription) {
                    this.setters.startTranscription();
                } else {
                    this.setters.showToast?.('Transcribe', 'Starting transcription...', 'info');
                }
                break;
            }

            case 'set_quality':
            case 'quality': {
                const q = command.quality || command.preset;
                const valid = ['720p', '1080p', '1440p'];
                if (valid.includes(q)) {
                    this.setters.setRecordingQuality?.(q);
                    this.setters.showToast?.('Quality', `Set to ${q}`, 'success');
                } else {
                    this.setters.showToast?.('Quality', `Invalid: ${q}. Use 720p, 1080p, or 1440p.`, 'error');
                }
                break;
            }

            case 'set_format': {
                const valid = ['mp4-h264', 'mp4', 'webm-vp9', 'webm-vp8', 'webm', 'mkv'];
                const match = valid.find(f => f.includes(command.format));
                if (match) {
                    this.setters.setRecordingFormat?.(match);
                    this.setters.showToast?.('Format', `Set to ${match}`, 'success');
                } else {
                    this.setters.showToast?.('Format', `Unknown: ${command.format}`, 'error');
                }
                break;
            }

            case 'cursor_fx':
                this.setters.setCursorFxEnabled?.(command.enabled);
                this.setters.showToast?.('Cursor FX', command.enabled ? 'Enabled' : 'Disabled', 'success');
                break;

            case 'annotate':
                this.setters.setAnnotationEnabled?.(true);
                this.setters.setAnnotationTool?.(command.tool || 'pen');
                if (command.color) this.setters.setAnnotationColor?.(command.color);
                this.setters.showToast?.('Annotation', `Switched to ${command.tool || 'pen'}`, 'success');
                break;

            case 'countdown':
                this.setters.setCountdownEnabled?.(command.enabled);
                this.setters.showToast?.('Countdown', command.enabled ? 'Enabled' : 'Disabled', 'success');
                break;

            case 'start_recording':
                this.setters.startRecording?.();
                this.setters.showToast?.('Recording', 'Starting...', 'success');
                break;

            case 'stop_recording':
                this.setters.stopRecording?.();
                this.setters.showToast?.('Recording', 'Stopped', 'success');
                break;

            case 'pause_recording':
                this.setters.pauseRecording?.();
                this.setters.showToast?.('Recording', 'Paused', 'success');
                break;

            case 'resume_recording':
                this.setters.resumeRecording?.();
                this.setters.showToast?.('Recording', 'Resumed', 'success');
                break;

            case 'blur_bg': {
                const amount = command.amount || 10;
                if (this.setters.addFilter) {
                    this.setters.addFilter({ filterId: 'blur', params: { radius: Math.min(20, amount) } });
                }
                this.setters.showToast?.('Background Blur', `Applied blur (${amount})`, 'success');
                break;
            }

            case 'thumbnail': {
                if (this.setters.extractThumbnail) {
                    this.setters.extractThumbnail(command.time || 0);
                } else {
                    this.setters.showToast?.('Thumbnail', `Extract at ${command.time}s`, 'info');
                }
                break;
            }

            case 'description': {
                if (this.setters.generateDescription) {
                    this.setters.generateDescription();
                } else {
                    this.setters.showToast?.('Description', 'Generating YouTube metadata...', 'info');
                }
                break;
            }

            case 'help':
            case 'chat':
                // Handled by useAI, not CommandExecutor
                break;

            default:
                this.setters.showToast?.('AI', `Unknown: ${command.action}`, 'error');
        }
    }
}
