// ProxyManager — generate low-res proxies for smooth editing, swap to full-res on export

export class ProxyManager {
    constructor() {
        this.proxyMap = new Map(); // originalBlob → proxyBlob
        this.proxyHeight = 360;
    }

    // Generate a low-res proxy from a video blob
    async generateProxy(blob) {
        if (this.proxyMap.has(blob)) return this.proxyMap.get(blob);

        return new Promise((resolve) => {
            const url = URL.createObjectURL(blob);
            const video = document.createElement('video');
            video.src = url;
            video.muted = true;
            video.crossOrigin = 'anonymous';

            video.onloadedmetadata = () => {
                const scale = this.proxyHeight / video.videoHeight;
                const w = Math.round(video.videoWidth * scale);
                const h = this.proxyHeight;

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');

                const stream = canvas.captureStream(15); // 15fps for proxy
                const recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp8',
                    videoBitsPerSecond: 500000 // low bitrate
                });

                const chunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const proxyBlob = new Blob(chunks, { type: 'video/webm' });
                    this.proxyMap.set(blob, proxyBlob);
                    URL.revokeObjectURL(url);
                    resolve(proxyBlob);
                };

                recorder.start();
                video.play();

                const drawFrame = () => {
                    if (video.ended || video.paused) {
                        recorder.stop();
                        return;
                    }
                    ctx.drawImage(video, 0, 0, w, h);
                    requestAnimationFrame(drawFrame);
                };

                video.onplay = () => drawFrame();
            };

            video.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(blob); // fallback to original
            };
        });
    }

    // Get proxy blob for a given original, or return original if no proxy
    getProxy(blob) {
        return this.proxyMap.get(blob) || blob;
    }

    // Check if a proxy exists
    hasProxy(blob) {
        return this.proxyMap.has(blob);
    }

    // Clear all proxies
    clear() {
        this.proxyMap.clear();
    }

    // Get proxy stats
    getStats() {
        let totalSaved = 0;
        for (const [original, proxy] of this.proxyMap) {
            totalSaved += original.size - proxy.size;
        }
        return {
            proxyCount: this.proxyMap.size,
            spaceSaved: totalSaved,
        };
    }
}

export const proxyManager = new ProxyManager();
