class MediaManager {
    async getScreenStream(sourceType = 'screen') {
        const videoConstraints = {
            cursor: 'always',
            frameRate: { ideal: 30, max: 30 }
        };

        switch (sourceType) {
            case 'window':
                videoConstraints.displaySurface = 'window';
                break;
            case 'tab':
                videoConstraints.displaySurface = 'browser';
                break;
            case 'screen':
            default:
                videoConstraints.displaySurface = 'monitor';
                break;
        }

        return navigator.mediaDevices.getDisplayMedia({
            video: videoConstraints,
            audio: true
        });
    }

    async getCameraStream(width, height, deviceId) {
        return navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { max: width || 1920 },
                height: { max: height || 1080 },
                frameRate: { ideal: 30, max: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
    }

    async getAudioStream(deviceId) {
        return navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        });
    }

    async getSystemAudio() {
        try {
            // System audio via getDisplayMedia (browser must support it)
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: {
                    suppressLocalAudioPlayback: false
                }
            });
            return stream;
        } catch {
            // System audio not supported or denied
            return null;
        }
    }

    async enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return {
                cameras: devices.filter(d => d.kind === 'videoinput'),
                microphones: devices.filter(d => d.kind === 'audioinput'),
            };
        } catch {
            return { cameras: [], microphones: [] };
        }
    }

    stopStream(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
}

export const mediaManager = new MediaManager();
