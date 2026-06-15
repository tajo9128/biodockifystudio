import { useState, useCallback } from 'react';

export const useClipBin = () => {
    const [clips, setClips] = useState([]);

    const addClip = useCallback((file) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            const duration = video.duration || 0;
            const durationStr = duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : '?';
            setClips(prev => [...prev, {
                id: `bin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: file.name,
                url,
                duration,
                durationStr,
                resolution: `${video.videoWidth || '?'}x${video.videoHeight || '?'}`,
                size: file.size,
                type: file.type || 'video',
                file,
            }]);
        };
        video.src = url;
    }, []);

    const importFiles = useCallback((files) => {
        Array.from(files).forEach(addClip);
    }, [addClip]);

    const removeClip = useCallback((id) => {
        setClips(prev => {
            const clip = prev.find(c => c.id === id);
            if (clip?.url) URL.revokeObjectURL(clip.url);
            return prev.filter(c => c.id !== id);
        });
    }, []);

    const clearAll = useCallback(() => {
        clips.forEach(c => { if (c.url) URL.revokeObjectURL(c.url); });
        setClips([]);
    }, [clips]);

    return { clips, addClip, importFiles, removeClip, clearAll };
};
