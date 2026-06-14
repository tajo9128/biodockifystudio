const listeners = new Set();

let lastRecording = null;

export const recordingStore = {
    set(blob, mimeType, name) {
        if (lastRecording?.url) URL.revokeObjectURL(lastRecording.url);
        lastRecording = {
            blob,
            mimeType: mimeType || blob?.type || 'video/webm',
            name: name || `recording-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`,
            url: blob ? URL.createObjectURL(blob) : null,
            createdAt: Date.now(),
        };
        listeners.forEach(fn => fn(lastRecording));
    },

    get() {
        return lastRecording;
    },

    clear() {
        if (lastRecording?.url) URL.revokeObjectURL(lastRecording.url);
        lastRecording = null;
        listeners.forEach(fn => fn(null));
    },

    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};
