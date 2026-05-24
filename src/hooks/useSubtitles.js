import { useState, useCallback } from 'react';

// Auto-subtitle via Ollama Whisper or Web Speech API fallback
export const useSubtitles = () => {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [subtitles, setSubtitles] = useState([]); // [{ start, end, text }]

    // Generate subtitles from audio blob using Ollama Whisper
    const generateFromOllama = useCallback(async (blob) => {
        setIsTranscribing(true);
        try {
            // Convert blob to base64 for Ollama
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

            // Try Ollama whisper endpoint
            const endpoints = ['/api/ollama/api/generate', 'http://localhost:11434/api/generate'];
            let result = null;

            for (const endpoint of endpoints) {
                try {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'whisper',
                            prompt: base64,
                            stream: false,
                        }),
                    });
                    if (res.ok) {
                        result = await res.json();
                        break;
                    }
                } catch { continue; }
            }

            if (result?.response) {
                // Parse whisper output into subtitle segments
                const segments = parseWhisperOutput(result.response);
                setSubtitles(segments);
                return segments;
            }

            // Fallback: try transcription via chat model
            const chatRes = await fetch('/api/ollama/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2',
                    messages: [{
                        role: 'user',
                        content: 'Transcribe this audio description into timestamped subtitles in SRT format. The audio is a screen recording.'
                    }],
                    stream: false,
                }),
            });

            if (chatRes.ok) {
                const chatData = await chatRes.json();
                if (chatData.message?.content) {
                    const segments = parseSRT(chatData.message.content);
                    setSubtitles(segments);
                    return segments;
                }
            }

            return [];
        } catch {
            return [];
        } finally {
            setIsTranscribing(false);
        }
    }, []);

    // Fallback: Web Speech API (real-time during recording)
    const startLiveTranscription = useCallback((lang = 'en-US') => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return null;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        const startTime = Date.now();

        recognition.onresult = (event) => {
            const newSubtitles = [];
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    const _offset = result[0].transcript.length;
                    newSubtitles.push({
                        start: (startTime + i * 5000) / 1000,
                        end: (startTime + (i + 1) * 5000) / 1000,
                        text: result[0].transcript.trim(),
                    });
                }
            }
            setSubtitles(prev => [...prev, ...newSubtitles]);
        };

        recognition.start();
        return recognition;
    }, []);

    // Convert subtitles to text overlay clips for timeline
    const toOverlayClips = useCallback((trackIndex = 0) => {
        return subtitles.map((sub, i) => ({
            id: `subtitle_${i}`,
            type: 'text',
            trackIndex,
            startTime: sub.start,
            duration: sub.end - sub.start,
            sourceStart: 0,
            sourceEnd: sub.end - sub.start,
            label: sub.text,
            color: '#f59e0b',
            speed: 1,
            filters: [],
            keyframes: {},
            text: sub.text,
        }));
    }, [subtitles]);

    // Clear subtitles
    const clearSubtitles = useCallback(() => {
        setSubtitles([]);
    }, []);

    // Manually add a subtitle
    const addSubtitle = useCallback((start, end, text) => {
        setSubtitles(prev => [...prev, { start, end, text }].sort((a, b) => a.start - b.start));
    }, []);

    return {
        isTranscribing,
        subtitles,
        setSubtitles,
        generateFromOllama,
        startLiveTranscription,
        toOverlayClips,
        clearSubtitles,
        addSubtitle,
    };
};

// Parse whisper timestamped output into subtitle segments
function parseWhisperOutput(text) {
    const segments = [];
    // Whisper typically outputs: [HH:MM:SS.mmm --> HH:MM:SS.mmm] text
    const regex = /\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})\]\s*(.+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const start = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
        const end = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000;
        segments.push({ start, end, text: match[9].trim() });
    }
    // Fallback: split by newlines with sequential timing
    if (segments.length === 0 && text.trim()) {
        const lines = text.trim().split('\n').filter(l => l.trim());
        lines.forEach((line, i) => {
            segments.push({
                start: i * 3,
                end: (i + 1) * 3,
                text: line.trim(),
            });
        });
    }
    return segments;
}

// Parse SRT format into subtitle segments
function parseSRT(srt) {
    const segments = [];
    const blocks = srt.trim().split(/\n\s*\n/);
    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 3) continue;
        const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
        if (!timeMatch) continue;
        const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
        const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
        const text = lines.slice(2).join(' ').trim();
        segments.push({ start, end, text });
    }
    return segments;
}
