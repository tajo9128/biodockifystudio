# Phase 5: Waveform Scaling & Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audio waveforms scale in height with horizontal zoom, allowing syllable-level precision cutting.

**Architecture:** WaveformCanvas component renders actual waveform data from audio clips using Web Audio API. Waveform height scales with zoom level. At max zoom, individual waveform peaks are visible.

**Tech Stack:** React 19, Web Audio API, Canvas

## Global Constraints
- Browser-based React SPA, no server changes
- Must preserve all Phase 1-4 features
- No new npm dependencies

---

### Task 1: Waveform Data Extraction Utility

**Files:**
- Create: `src/utils/WaveformExtractor.js`

- [ ] **Step 1: Create WaveformExtractor.js**

Utility that extracts waveform data from audio/video files using Web Audio API.

```js
// Extracts waveform peaks from a media file for rendering
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
        // Fallback: generate synthetic waveform
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
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/WaveformExtractor.js
git commit -m "feat: add WaveformExtractor utility for audio peak extraction"
```

---

### Task 2: WaveformCanvas Component

**Files:**
- Create: `src/components/Timeline/WaveformCanvas.jsx`
- Create: `src/components/Timeline/WaveformCanvas.css`

- [ ] **Step 1: Create WaveformCanvas.jsx**

Renders a waveform from extracted peak data, scaling height with zoom.

```jsx
import React, { useRef, useEffect, useState } from 'react';
import { extractWaveform } from '../../utils/WaveformExtractor';
import './WaveformCanvas.css';

export const WaveformCanvas = ({
    clip,
    zoom,
    height = 40,
    color = '#10b981',
    backgroundColor = 'rgba(16, 185, 129, 0.1)',
}) => {
    const canvasRef = useRef(null);
    const [peaks, setPeaks] = useState(null);

    // Extract waveform data when clip changes
    useEffect(() => {
        const url = clip.sourceUrl || (clip._fileRef ? URL.createObjectURL(clip._fileRef) : null);
        if (!url || clip.type !== 'audio') return;

        let cancelled = false;
        extractWaveform(url, 300).then(data => {
            if (!cancelled) setPeaks(data);
        });
        return () => { cancelled = true; };
    }, [clip.sourceUrl, clip._fileRef, clip.type]);

    // Draw waveform
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !peaks) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Waveform height scales with zoom
        const zoomFactor = Math.min(zoom, 4);
        const barWidth = Math.max(1, w / peaks.length);
        const centerY = h / 2;

        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, w, h);

        // Draw center line
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Draw waveform bars (symmetric around center)
        for (let i = 0; i < peaks.length; i++) {
            const x = i * barWidth;
            const peakHeight = peaks[i] * centerY * zoomFactor;
            const clampedHeight = Math.min(peakHeight, centerY - 1);

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7 + peaks[i] * 0.3;

            // Top half
            ctx.fillRect(x, centerY - clampedHeight, barWidth - 0.5, clampedHeight);
            // Bottom half (mirror)
            ctx.fillRect(x, centerY, barWidth - 0.5, clampedHeight);
        }

        ctx.globalAlpha = 1;
    }, [peaks, zoom, color, backgroundColor]);

    // Resize canvas to match parent
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.parentElement?.offsetWidth || 200;
            canvas.height = height;
        });
        observer.observe(canvas.parentElement);
        return () => observer.disconnect();
    }, [height]);

    return (
        <canvas
            ref={canvasRef}
            className="tl-waveform-canvas"
            style={{ height }}
        />
    );
};
```

- [ ] **Step 2: Create WaveformCanvas.css**

```css
.tl-waveform-canvas {
    position: absolute;
    bottom: 4px;
    left: 4px;
    right: 4px;
    pointer-events: none;
    z-index: 1;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline/WaveformCanvas.jsx src/components/Timeline/WaveformCanvas.css
git commit -m "feat: add WaveformCanvas with zoom-scaled waveform rendering"
```

---

### Task 3: Replace Fake Waveforms in Timeline

**Files:**
- Modify: `src/components/Timeline/Timeline.jsx`

- [ ] **Step 1: Read Timeline.jsx**

- [ ] **Step 2: Add import**

```js
import { WaveformCanvas } from './WaveformCanvas';
```

- [ ] **Step 3: Replace fake waveform with WaveformCanvas**

In the `renderClip` function, find the section where the fake sine-wave waveform is rendered for audio clips. It looks like:

```jsx
{clip.type === 'audio' && (
    <div className="tl-clip-waveform" style={{ ... }}>
        {Array.from({ length: 40 }).map((_, i) => {
            const h = 15 + Math.sin(i * 0.5) * 30 + Math.sin(i * 1.7) * 20;
            return <div key={i} style={{ ... }} />;
        })}
    </div>
)}
```

Replace it with:

```jsx
{clip.type === 'audio' && (
    <WaveformCanvas
        clip={clip}
        zoom={zoom}
        height={TRACK_HEIGHT - 8}
        color="#10b981"
        backgroundColor="rgba(16, 185, 129, 0.1)"
    />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline/Timeline.jsx
git commit -m "feat: replace fake waveform bars with WaveformCanvas in Timeline"
```

---

### Task 4: Integration Test & Final Polish

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

Test checklist (ALL phases):
1. Import audio clip → see real waveform rendering
2. Zoom in → waveform bars get taller and narrower
3. Zoom out → waveform bars get shorter and wider
4. At max zoom, individual peaks visible for precise cutting
5. Play/pause works (Space)
6. Split at playhead works (S)
7. Ripple delete works (Delete)
8. J/K/L shuttle works
9. Q/W trim works
10. Markers work (M)
11. Keyframe diamonds visible on clips with keyframes
12. Audio envelope visible on audio clips
13. Zoom-n-Pan track works
14. Cursor track works
15. Annotations track works
16. Animations track works
17. TransitionLibrary panel visible
18. Drag transitions between clips
19. Drag effects onto clips → fx badge
20. Magnetic toggle works

- [ ] **Step 2: Run lint**

Run: `npm run lint`

- [ ] **Step 3: Fix and commit**

```bash
git add -A
git commit -m "fix: final polish for Phase 5 waveform scaling"
```
