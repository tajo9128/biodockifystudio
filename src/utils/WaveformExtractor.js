const waveformCache = new Map();

export const extractWaveform = async (url, numBins = 200) => {
    const cacheKey = `${url}_${numBins}`;
    if (waveformCache.has(cacheKey)) return waveformCache.get(cacheKey);

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const channelData = audioBuffer.getChannelData(0);
        const samplesPerBin = Math.floor(channelData.length / numBins);
        const peaks = [];

        for (let i = 0; i < numBins; i++) {
            let max = 0;
            const start = i * samplesPerBin;
            const end = Math.min(start + samplesPerBin, channelData.length);
            for (let j = start; j < end; j++) {
                const abs = Math.abs(channelData[j]);
                if (abs > max) max = abs;
            }
            peaks.push(max);
        }

        audioContext.close();
        waveformCache.set(cacheKey, peaks);
        return peaks;
    } catch {
        const peaks = [];
        for (let i = 0; i < numBins; i++) {
            peaks.push(0.3 + Math.sin(i * 0.5) * 0.2 + Math.sin(i * 1.7) * 0.15);
        }
        return peaks;
    }
};

export const clearWaveformCache = () => {
    waveformCache.clear();
};
