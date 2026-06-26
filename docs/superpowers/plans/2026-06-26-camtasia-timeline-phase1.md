# Camtasia Timeline — Phase 1: Core Timeline UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the timeline keyboard-driven, magnetic, support J/L cuts, Q/W trimming, and markers/chapters — the core editing speed features that make Camtasia fast.

**Architecture:** Migrate timeline state from useState hook to Zustand store. Add J/L cut fields to clip model. Add keyboard shortcut system for J/K/L, Q/W, M. Add playhead snapping. Add markers/chapters. Keep DOM rendering for clips.

**Tech Stack:** Zustand (state), React 19, existing DOM timeline components

## Global Constraints
- Browser-based React SPA, no server-side changes
- Must preserve all existing features (undo/redo, video cache, rAF playback, renderFrame, clip resize/move)
- No new npm dependencies beyond Zustand
- Follow existing code conventions (functional components, hooks, CSS modules)
- Existing lint must pass (npm run lint — 35 errors pre-existing)

## File Structure

| File | Responsibility |
|------|---------------|
| `src/store/timelineStore.js` | Zustand store — all timeline state + actions |
| `src/hooks/useTimelineKeyboard.js` | J/K/L shuttle, Q/W trim, S split, M marker, Delete |
| `src/components/Timeline/Playhead.jsx` | Snapping playhead component |
| `src/components/Timeline/MarkerLayer.jsx` | Markers on ruler (colored flags, named) |
| `src/components/Timeline/MarkerPopup.jsx` | Marker naming popup |
| `src/components/Timeline/Timeline.jsx` | Updated to use Zustand store |
| `src/hooks/useTimeline.js` | Deprecated — thin wrapper around Zustand |
| `src/components/EditMode/EditMode.jsx` | Updated to use Zustand store |
| `src/components/RightPanel/RightPanel.jsx` | Show markers list, magnetic mode toggle |
| `src/components/Timeline/ClipContextMenu.jsx` | Add J/L cut options |

---

### Task 1: Create Zustand Store

**Files:**
- Create: `src/store/timelineStore.js`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `useTimelineStore` hook with all state and actions

- [ ] **Step 1: Install Zustand**

```bash
npm install zustand
```

Run: `npm install zustand`
Expected: zustand added to package.json dependencies

- [ ] **Step 2: Create the Zustand store**

Create `src/store/timelineStore.js`:

```js
import { create } from 'zustand';

let clipIdCounter = 0;

const createClip = (overrides = {}) => ({
    id: `clip_${++clipIdCounter}`,
    trackIndex: 0,
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceEnd: 10,
    sourceUrl: null,
    speed: 1.0,
    filters: [],
    transitions: { in: null, out: null },
    keyframes: {},
    label: '',
    color: '#8b5cf6',
    type: 'video',
    // J/L cut fields
    audioOffset: 0,      // seconds audio start differs from video start
    audioDuration: null,  // null = same as video duration
    ...overrides,
});

const MAX_UNDO = 50;

const computeDuration = (clips) => {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map(c => c.startTime + c.duration));
};

export const useTimelineStore = create((set, get) => ({
    // State
    clips: [],
    tracks: [
        { id: 'track_0', name: 'Video 1', type: 'video', muted: false, locked: false, visible: true },
        { id: 'track_1', name: 'Video 2', type: 'video', muted: false, locked: false, visible: true },
        { id: 'track_2', name: 'Screen', type: 'video', muted: false, locked: false, visible: true },
        { id: 'track_3', name: 'Webcam', type: 'video', muted: false, locked: false, visible: true },
        { id: 'track_4', name: 'Audio', type: 'audio', muted: false, locked: false, visible: true },
    ],
    currentTime: 0,
    duration: 0,
    selectedClipId: null,
    isPlaying: false,
    zoom: 1,
    magneticMode: true,
    markers: [],

    // Undo/Redo
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,
    _isUndoRedo: false,

    // Clip actions
    addClip: (trackIndex, clipData) => {
        const state = get();
        const clip = createClip({ trackIndex, ...clipData });
        const newClips = [...state.clips, clip];
        set({
            clips: newClips,
            duration: computeDuration(newClips),
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
        return clip;
    },

    removeClip: (id) => {
        const state = get();
        const clip = state.clips.find(c => c.id === id);
        if (!clip) return;

        const newClips = state.clips.filter(c => c.id !== id);

        // Ripple: pull later clips on same track back
        if (state.magneticMode && clip) {
            const gap = clip.duration;
            const removedEnd = clip.startTime + clip.duration;
            newClips.forEach(c => {
                if (c.trackIndex === clip.trackIndex && c.startTime >= removedEnd) {
                    c.startTime -= gap;
                }
            });
        }

        set({
            clips: newClips,
            duration: computeDuration(newClips),
            selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
    },

    updateClip: (id, updates) => {
        const state = get();
        const newClips = state.clips.map(c => c.id === id ? { ...c, ...updates } : c);
        set({
            clips: newClips,
            duration: computeDuration(newClips),
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
    },

    moveClip: (id, newStartTime, newTrackIndex) => {
        set(state => ({
            clips: state.clips.map(c => {
                if (c.id !== id) return c;
                return {
                    ...c,
                    startTime: Math.max(0, newStartTime),
                    ...(newTrackIndex !== undefined ? { trackIndex: newTrackIndex } : {}),
                };
            }),
        }));
    },

    resizeClip: (id, newDuration, fromLeft = false) => {
        set(state => ({
            clips: state.clips.map(c => {
                if (c.id !== id) return c;
                const dur = Math.max(0.1, newDuration);
                if (fromLeft) {
                    const diff = c.duration - dur;
                    return {
                        ...c,
                        startTime: c.startTime + diff,
                        duration: dur,
                        sourceStart: c.sourceStart + diff * (c.speed || 1),
                    };
                }
                return { ...c, duration: dur };
            }),
        }));
    },

    splitAtPlayhead: () => {
        const state = get();
        if (!state.selectedClipId) return;
        const clip = state.clips.find(c => c.id === state.selectedClipId);
        if (!clip) return;

        const splitTime = state.currentTime;
        if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) return;

        const leftDuration = splitTime - clip.startTime;
        const rightDuration = clip.duration - leftDuration;
        const rightSourceStart = clip.sourceStart + leftDuration * clip.speed;

        const rightClip = createClip({
            trackIndex: clip.trackIndex,
            startTime: splitTime,
            duration: rightDuration,
            sourceStart: rightSourceStart,
            sourceEnd: clip.sourceEnd,
            sourceUrl: clip.sourceUrl,
            speed: clip.speed,
            filters: [...clip.filters],
            transitions: { ...clip.transitions },
            keyframes: clip.keyframes ? JSON.parse(JSON.stringify(clip.keyframes)) : {},
            label: clip.label,
            color: clip.color,
            type: clip.type,
            audioOffset: clip.audioOffset,
            audioDuration: clip.audioDuration ? clip.audioDuration - leftDuration : null,
        });

        const newClips = state.clips.map(c => c.id === state.selectedClipId
            ? { ...c, duration: leftDuration, sourceEnd: clip.sourceStart + leftDuration * clip.speed, audioDuration: leftDuration }
            : c
        );

        set({
            clips: [...newClips, rightClip],
            duration: computeDuration([...newClips, rightClip]),
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
    },

    // J/L cut: adjust audio offset relative to video
    setAudioOffset: (clipId, offset) => {
        set(state => ({
            clips: state.clips.map(c => c.id === clipId ? { ...c, audioOffset: offset } : c),
        }));
    },

    setAudioDuration: (clipId, dur) => {
        set(state => ({
            clips: state.clips.map(c => c.id === clipId ? { ...c, audioDuration: dur } : c),
        }));
    },

    // Trim start to playhead (Q key)
    trimStartToPlayhead: () => {
        const state = get();
        if (!state.selectedClipId) return;
        const clip = state.clips.find(c => c.id === state.selectedClipId);
        if (!clip) return;
        if (state.currentTime <= clip.startTime || state.currentTime >= clip.startTime + clip.duration) return;

        const trimAmount = state.currentTime - clip.startTime;
        const newClips = state.clips.map(c => {
            if (c.id !== state.selectedClipId) return c;
            return {
                ...c,
                startTime: state.currentTime,
                duration: c.duration - trimAmount,
                sourceStart: c.sourceStart + trimAmount * c.speed,
            };
        });

        // Ripple: pull all later clips on same track back
        if (state.magneticMode) {
            newClips.forEach(c => {
                if (c.trackIndex === clip.trackIndex && c.id !== state.selectedClipId && c.startTime > clip.startTime) {
                    c.startTime -= trimAmount;
                }
            });
        }

        set({
            clips: newClips,
            duration: computeDuration(newClips),
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
    },

    // Trim end to playhead (W key)
    trimEndToPlayhead: () => {
        const state = get();
        if (!state.selectedClipId) return;
        const clip = state.clips.find(c => c.id === state.selectedClipId);
        if (!clip) return;
        if (state.currentTime <= clip.startTime || state.currentTime >= clip.startTime + clip.duration) return;

        const clipEnd = clip.startTime + clip.duration;
        const trimAmount = clipEnd - state.currentTime;

        const newClips = state.clips.map(c => {
            if (c.id !== state.selectedClipId) return c;
            return {
                ...c,
                duration: c.duration - trimAmount,
            };
        });

        // Ripple: pull all later clips on same track back
        if (state.magneticMode) {
            newClips.forEach(c => {
                if (c.trackIndex === clip.trackIndex && c.id !== state.selectedClipId && c.startTime > clipEnd) {
                    c.startTime -= trimAmount;
                }
            });
        }

        set({
            clips: newClips,
            duration: computeDuration(newClips),
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
    },

    // Roll trim: move cut point between two adjacent clips
    rollTrim: (clipId, deltaTime) => {
        const state = get();
        const clip = state.clips.find(c => c.id === clipId);
        if (!clip) return;

        // Find adjacent clip on same track
        const adjacent = state.clips.find(c =>
            c.trackIndex === clip.trackIndex &&
            c.id !== clipId &&
            Math.abs(c.startTime - (clip.startTime + clip.duration)) < 0.01
        );
        if (!adjacent) return;

        const newDuration = Math.max(0.1, clip.duration + deltaTime);
        const adjDuration = Math.max(0.1, adjacent.duration - deltaTime);

        set({
            clips: state.clips.map(c => {
                if (c.id === clipId) return { ...c, duration: newDuration };
                if (c.id === adjacent.id) return { ...c, startTime: clip.startTime + newDuration, duration: adjDuration };
                return c;
            }),
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
    },

    // Track actions
    addTrack: (name = 'New Track', type = 'video') => {
        const state = get();
        const id = `track_${Date.now()}`;
        set({
            tracks: [...state.tracks, { id, name, type, muted: false, locked: false, visible: true }],
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
    },

    removeTrack: (trackId) => {
        const state = get();
        const trackIndex = state.tracks.findIndex(t => t.id === trackId);
        if (trackIndex < 0) return;
        const newTracks = state.tracks.filter(t => t.id !== trackId);
        const newClips = state.clips
            .filter(c => c.trackIndex !== trackIndex)
            .map(c => ({
                ...c,
                trackIndex: c.trackIndex > trackIndex ? c.trackIndex - 1 : c.trackIndex,
            }));
        set({
            tracks: newTracks,
            clips: newClips,
            duration: computeDuration(newClips),
            undoStack: [...state.undoStack.slice(-MAX_UNDO + 1), { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            redoStack: [],
            canUndo: true,
            canRedo: false,
        });
    },

    toggleTrackMute: (trackId) => {
        set(state => ({
            tracks: state.tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t),
        }));
    },

    toggleTrackLock: (trackId) => {
        set(state => ({
            tracks: state.tracks.map(t => t.id === trackId ? { ...t, locked: !t.locked } : t),
        }));
    },

    // Playback
    setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
    setDuration: (d) => set({ duration: d }),
    setSelectedClipId: (id) => set({ selectedClipId: id }),
    setZoom: (z) => set({ zoom: typeof z === 'function' ? z(get().zoom) : z }),
    toggleMagneticMode: () => set(state => ({ magneticMode: !state.magneticMode })),

    // Markers
    addMarker: (time, color = '#f59e0b', label = '') => {
        const marker = { id: `marker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, time, color, label };
        set(state => ({ markers: [...state.markers, marker] }));
        return marker;
    },

    removeMarker: (id) => {
        set(state => ({ markers: state.markers.filter(m => m.id !== id) }));
    },

    updateMarker: (id, updates) => {
        set(state => ({
            markers: state.markers.map(m => m.id === id ? { ...m, ...updates } : m),
        }));
    },

    moveMarker: (id, newTime) => {
        set(state => ({
            markers: state.markers.map(m => m.id === id ? { ...m, time: Math.max(0, newTime) } : m),
        }));
    },

    // Undo/Redo
    undo: () => {
        const state = get();
        if (state.undoStack.length === 0 || state._isUndoRedo) return;
        const snapshot = state.undoStack[state.undoStack.length - 1];
        const newUndo = state.undoStack.slice(0, -1);
        set({
            _isUndoRedo: true,
            clips: snapshot.clips,
            tracks: snapshot.tracks,
            duration: computeDuration(snapshot.clips),
            undoStack: newUndo,
            redoStack: [...state.redoStack, { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            canUndo: newUndo.length > 0,
            canRedo: true,
            _isUndoRedo: false,
        });
    },

    redo: () => {
        const state = get();
        if (state.redoStack.length === 0 || state._isUndoRedo) return;
        const snapshot = state.redoStack[state.redoStack.length - 1];
        const newRedo = state.redoStack.slice(0, -1);
        set({
            _isUndoRedo: true,
            clips: snapshot.clips,
            tracks: snapshot.tracks,
            duration: computeDuration(snapshot.clips),
            redoStack: newRedo,
            undoStack: [...state.undoStack, { clips: JSON.parse(JSON.stringify(state.clips)), tracks: JSON.parse(JSON.stringify(state.tracks)) }],
            canUndo: true,
            canRedo: newRedo.length > 0,
            _isUndoRedo: false,
        });
    },

    // Load project state
    loadProject: (projectClips, projectTracks) => {
        set({
            clips: projectClips || [],
            tracks: projectTracks || get().tracks,
            duration: computeDuration(projectClips || []),
            undoStack: [],
            redoStack: [],
            canUndo: false,
            canRedo: false,
        });
    },

    // Reset
    reset: () => {
        clipIdCounter = 0;
        set({
            clips: [],
            currentTime: 0,
            duration: 0,
            selectedClipId: null,
            isPlaying: false,
            zoom: 1,
            magneticMode: true,
            markers: [],
            undoStack: [],
            redoStack: [],
            canUndo: false,
            canRedo: false,
        });
    },
}));
```

- [ ] **Step 3: Verify Zustand store works**

Run: `npm run dev`
Expected: Dev server starts, no import errors

- [ ] **Step 4: Commit**

```bash
git add src/store/timelineStore.js package.json package-lock.json
git commit -m "feat: add Zustand store for timeline state"
```

---

### Task 2: Keyboard Shortcuts System

**Files:**
- Create: `src/hooks/useTimelineKeyboard.js`

**Interfaces:**
- Consumes: `useTimelineStore` (from Task 1)
- Produces: `useTimelineKeyboard()` hook — registers all keyboard shortcuts

- [ ] **Step 1: Create keyboard shortcuts hook**

Create `src/hooks/useTimelineKeyboard.js`:

```js
import { useEffect, useCallback, useRef } from 'react';
import { useTimelineStore } from '../store/timelineStore';

export const useTimelineKeyboard = ({
    play,
    pause,
    isPlaying,
    videoCacheRef,
}) => {
    const shuttleRef = useRef(null); // for J/L shuttle speed
    const lastShuttleKey = useRef(null);
    const lastShuttleTime = useRef(0);

    const handleKeyDown = useCallback((e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        if (e.target.isContentEditable) return;

        const store = useTimelineStore.getState();
        const { selectedClipId, splitAtPlayhead, removeClip, trimStartToPlayhead,
                trimEndToPlayhead, addMarker, undo, redo, setCurrentTime,
                currentTime, duration, zoom, setZoom } = store;

        // Space: play/pause
        if (e.code === 'Space') {
            e.preventDefault();
            isPlaying ? pause() : play();
            return;
        }

        // S or C: split at playhead
        if (e.code === 'KeyS' || e.code === 'KeyC') {
            if (selectedClipId) {
                e.preventDefault();
                splitAtPlayhead();
            }
            return;
        }

        // Delete / Backspace: ripple delete selected clip
        if (e.code === 'Delete' || e.code === 'Backspace') {
            if (selectedClipId) {
                e.preventDefault();
                removeClip(selectedClipId);
            }
            return;
        }

        // Q: trim start to playhead
        if (e.code === 'KeyQ') {
            if (selectedClipId) {
                e.preventDefault();
                trimStartToPlayhead();
            }
            return;
        }

        // W: trim end to playhead
        if (e.code === 'KeyW') {
            if (selectedClipId) {
                e.preventDefault();
                trimEndToPlayhead();
            }
            return;
        }

        // M: drop marker
        if (e.code === 'KeyM') {
            e.preventDefault();
            addMarker(currentTime);
            return;
        }

        // J: shuttle backward
        if (e.code === 'KeyJ') {
            e.preventDefault();
            const now = Date.now();
            if (lastShuttleKey.current === 'J' && now - lastShuttleTime.current < 500) {
                shuttleRef.current = Math.min((shuttleRef.current || 1) * 2, 16);
            } else {
                shuttleRef.current = 1;
            }
            lastShuttleKey.current = 'J';
            lastShuttleTime.current = now;
            if (isPlaying) pause();
            setCurrentTime(Math.max(0, currentTime - shuttleRef.current));
            return;
        }

        // K: pause (stop shuttle)
        if (e.code === 'KeyK') {
            e.preventDefault();
            shuttleRef.current = null;
            lastShuttleKey.current = null;
            if (isPlaying) pause();
            return;
        }

        // L: shuttle forward
        if (e.code === 'KeyL') {
            e.preventDefault();
            const now = Date.now();
            if (lastShuttleKey.current === 'L' && now - lastShuttleTime.current < 500) {
                shuttleRef.current = Math.min((shuttleRef.current || 1) * 2, 16);
            } else {
                shuttleRef.current = 1;
            }
            lastShuttleKey.current = 'L';
            lastShuttleTime.current = now;
            if (isPlaying) pause();
            setCurrentTime(Math.min(duration, currentTime + shuttleRef.current));
            return;
        }

        // Ctrl+Z: undo
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
            e.preventDefault();
            undo();
            return;
        }

        // Ctrl+Shift+Z: redo
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && e.shiftKey) {
            e.preventDefault();
            redo();
            return;
        }

        // = / +: zoom in
        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
            e.preventDefault();
            setZoom(z => Math.min(10, z * 1.25));
            return;
        }

        // -: zoom out
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
            e.preventDefault();
            setZoom(z => Math.max(0.1, z * 0.8));
            return;
        }

        // ArrowLeft: nudge playhead left
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            setCurrentTime(Math.max(0, currentTime - (e.shiftKey ? 1 : 0.1)));
            return;
        }

        // ArrowRight: nudge playhead right
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            setCurrentTime(Math.min(duration, currentTime + (e.shiftKey ? 1 : 0.1)));
            return;
        }
    }, [isPlaying, play, pause, videoCacheRef]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};
```

- [ ] **Step 2: Verify hook compiles**

Run: `npm run dev`
Expected: No errors in console

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTimelineKeyboard.js
git commit -m "feat: add J/K/L shuttle, Q/W trim, M marker keyboard shortcuts"
```

---

### Task 3: Playhead Component with Snapping

**Files:**
- Create: `src/components/Timeline/Playhead.jsx`
- Create: `src/components/Timeline/Playhead.css`

**Interfaces:**
- Consumes: `currentTime`, `zoom`, `clips`, `markers`, `onSeek`
- Produces: `<Playhead>` component with snap behavior

- [ ] **Step 1: Create Playhead component**

Create `src/components/Timeline/Playhead.jsx`:

```jsx
import React, { useState, useCallback, useEffect } from 'react';
import './Playhead.css';

const TRACK_HEIGHT = 48;
const TIME_SCALE_BASE = 80;
const SNAP_THRESHOLD_PX = 3;

export const Playhead = ({
    currentTime,
    zoom,
    clips,
    markers,
    tracks,
    duration,
    onSeek,
    onPlayheadDrag,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    // Snap points: clip edges, markers, timeline start/end
    const getSnapPoints = useCallback(() => {
        const points = [0, duration];
        clips.forEach(c => {
            points.push(c.startTime, c.startTime + c.duration);
        });
        markers.forEach(m => {
            points.push(m.time);
        });
        return points;
    }, [clips, markers, duration]);

    // Find nearest snap point
    const snapToNearest = useCallback((time) => {
        const snapPoints = getSnapPoints();
        const snapPx = SNAP_THRESHOLD_PX / timeScale;
        let nearest = time;
        let minDist = Infinity;
        for (const pt of snapPoints) {
            const dist = Math.abs(pt - time);
            if (dist < minDist && dist < snapPx) {
                minDist = dist;
                nearest = pt;
            }
        }
        return nearest;
    }, [getSnapPoints, timeScale]);

    const handleMouseDown = useCallback((e) => {
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e) => {
            const scrollEl = document.querySelector('.tl-scroll');
            if (!scrollEl) return;
            const rect = scrollEl.getBoundingClientRect();
            const x = e.clientX - rect.left + scrollEl.scrollLeft;
            const rawTime = Math.max(0, xToTime(x));
            const snappedTime = snapToNearest(rawTime);
            onSeek(snappedTime);
            onPlayheadDrag?.(snappedTime);
        };
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, xToTime, snapToNearest, onSeek, onPlayheadDrag]);

    const x = timeToX(currentTime);

    return (
        <div
            className={`tl-playhead ${isDragging ? 'tl-playhead-dragging' : ''}`}
            style={{ left: x }}
            onMouseDown={handleMouseDown}
        >
            <div className="tl-playhead-head" />
            <div className="tl-playhead-line" />
        </div>
    );
};
```

- [ ] **Step 2: Create Playhead CSS**

Create `src/components/Timeline/Playhead.css`:

```css
.tl-playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    z-index: 100;
    pointer-events: none;
    transform: translateX(-1px);
}

.tl-playhead-head {
    position: absolute;
    top: 0;
    left: -6px;
    width: 14px;
    height: 14px;
    background: var(--primary, #8b5cf6);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    pointer-events: auto;
    cursor: grab;
}

.tl-playhead-dragging .tl-playhead-head {
    cursor: grabbing;
}

.tl-playhead-line {
    position: absolute;
    top: 14px;
    left: 0;
    width: 2px;
    bottom: 0;
    background: var(--primary, #8b5cf6);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline/Playhead.jsx src/components/Timeline/Playhead.css
git commit -m "feat: add Playhead component with snap-to-edges and snap-to-markers"
```

---

### Task 4: Marker Layer & Naming Popup

**Files:**
- Create: `src/components/Timeline/MarkerLayer.jsx`
- Create: `src/components/Timeline/MarkerPopup.jsx`

**Interfaces:**
- Consumes: `markers`, `zoom`, `currentTime`, `onAddMarker`, `onRemoveMarker`, `onUpdateMarker`, `onMoveMarker`, `onSeek`
- Produces: `<MarkerLayer>` and `<MarkerPopup>` components

- [ ] **Step 1: Create MarkerLayer component**

Create `src/components/Timeline/MarkerLayer.jsx`:

```jsx
import React, { useState, useCallback } from 'react';
import { MarkerPopup } from './MarkerPopup';
import './MarkerLayer.css';

const TIME_SCALE_BASE = 80;

const MARKER_COLORS = [
    '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
];

export const MarkerLayer = ({
    markers,
    zoom,
    currentTime,
    onAddMarker,
    onRemoveMarker,
    onUpdateMarker,
    onMoveMarker,
    onSeek,
}) => {
    const [editingMarker, setEditingMarker] = useState(null);
    const [draggingMarker, setDraggingMarker] = useState(null);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    const handleMarkerMouseDown = useCallback((e, marker) => {
        e.stopPropagation();
        setDraggingMarker({ id: marker.id, startX: e.clientX, origTime: marker.time });
    }, []);

    const handleMarkerDoubleClick = useCallback((e, marker) => {
        e.stopPropagation();
        setEditingMarker(marker);
    }, []);

    React.useEffect(() => {
        if (!draggingMarker) return;
        const handleMouseMove = (e) => {
            const scrollEl = document.querySelector('.tl-scroll');
            if (!scrollEl) return;
            const rect = scrollEl.getBoundingClientRect();
            const x = e.clientX - rect.left + scrollEl.scrollLeft;
            const newTime = Math.max(0, xToTime(x));
            onMoveMarker(draggingMarker.id, newTime);
        };
        const handleMouseUp = () => setDraggingMarker(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingMarker, xToTime, onMoveMarker]);

    return (
        <div className="tl-marker-layer">
            {markers.map(marker => (
                <div
                    key={marker.id}
                    className="tl-marker-flag"
                    style={{
                        left: timeToX(marker.time),
                        '--marker-color': marker.color,
                    }}
                    onMouseDown={(e) => handleMarkerMouseDown(e, marker)}
                    onDoubleClick={(e) => handleMarkerDoubleClick(e, marker)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        onRemoveMarker(marker.id);
                    }}
                >
                    <div className="tl-marker-flag-pole" />
                    <div className="tl-marker-flag-label">
                        {marker.label || ''}
                    </div>
                </div>
            ))}

            {editingMarker && (
                <MarkerPopup
                    marker={editingMarker}
                    onClose={() => setEditingMarker(null)}
                    onUpdate={(updates) => {
                        onUpdateMarker(editingMarker.id, updates);
                        setEditingMarker(null);
                    }}
                    colors={MARKER_COLORS}
                />
            )}
        </div>
    );
};
```

- [ ] **Step 2: Create MarkerPopup component**

Create `src/components/Timeline/MarkerPopup.jsx`:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import './MarkerPopup.css';

export const MarkerPopup = ({ marker, onClose, onUpdate, colors }) => {
    const [label, setLabel] = useState(marker.label || '');
    const [color, setColor] = useState(marker.color || '#f59e0b');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate({ label, color });
    };

    return (
        <div className="tl-marker-popup-overlay" onClick={onClose}>
            <div className="tl-marker-popup" onClick={e => e.stopPropagation()}>
                <h4>Marker</h4>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        className="tl-marker-popup-input"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder="Marker name (e.g. Introduction)"
                    />
                    <div className="tl-marker-popup-colors">
                        {colors.map(c => (
                            <button
                                key={c}
                                type="button"
                                className={`tl-marker-popup-color ${c === color ? 'active' : ''}`}
                                style={{ background: c }}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>
                    <div className="tl-marker-popup-actions">
                        <button type="button" className="tl-marker-popup-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="tl-marker-popup-save">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
```

- [ ] **Step 3: Create MarkerLayer CSS**

Create `src/components/Timeline/MarkerLayer.css`:

```css
.tl-marker-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 20px;
    z-index: 50;
    pointer-events: none;
}

.tl-marker-flag {
    position: absolute;
    top: 0;
    pointer-events: auto;
    cursor: grab;
    z-index: 51;
}

.tl-marker-flag-pole {
    width: 2px;
    height: 100vh;
    background: var(--marker-color, #f59e0b);
    opacity: 0.6;
    transform: translateX(-1px);
}

.tl-marker-flag-label {
    position: absolute;
    top: 0;
    left: 4px;
    background: var(--marker-color, #f59e0b);
    color: #000;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 2px;
    white-space: nowrap;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
}
```

- [ ] **Step 4: Create MarkerPopup CSS**

Create `src/components/Timeline/MarkerPopup.css`:

```css
.tl-marker-popup-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
}

.tl-marker-popup {
    background: var(--bg-secondary, #1e1e2e);
    border: 1px solid var(--border, #333);
    border-radius: 8px;
    padding: 16px;
    min-width: 260px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.tl-marker-popup h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--text-primary, #fff);
}

.tl-marker-popup-input {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border, #333);
    border-radius: 4px;
    background: var(--bg-primary, #12121a);
    color: var(--text-primary, #fff);
    font-size: 13px;
    margin-bottom: 12px;
    box-sizing: border-box;
}

.tl-marker-popup-colors {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
}

.tl-marker-popup-color {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
}

.tl-marker-popup-color.active {
    border-color: #fff;
}

.tl-marker-popup-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.tl-marker-popup-cancel,
.tl-marker-popup-save {
    padding: 6px 12px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 12px;
}

.tl-marker-popup-cancel {
    background: var(--bg-tertiary, #2a2a3a);
    color: var(--text-secondary, #aaa);
}

.tl-marker-popup-save {
    background: var(--primary, #8b5cf6);
    color: #fff;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Timeline/MarkerLayer.jsx src/components/Timeline/MarkerLayer.css src/components/Timeline/MarkerPopup.jsx src/components/Timeline/MarkerPopup.css
git commit -m "feat: add MarkerLayer with colored flags and MarkerPopup for naming"
```

---

### Task 5: Update Timeline.jsx to Use New Components

**Files:**
- Modify: `src/components/Timeline/Timeline.jsx`

**Interfaces:**
- Consumes: `useTimelineStore` (from Task 1), `Playhead` (from Task 3), `MarkerLayer` (from Task 4)
- Produces: Updated `<Timeline>` component using new Playhead and MarkerLayer

- [ ] **Step 1: Rewrite Timeline.jsx**

Replace entire `src/components/Timeline/Timeline.jsx` with:

```jsx
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ClipContextMenu } from './ClipContextMenu';
import { Playhead } from './Playhead';
import { MarkerLayer } from './MarkerLayer';
import { useTimelineStore } from '../../store/timelineStore';
import './Timeline.css';

const TRACK_HEIGHT = 48;
const TIME_SCALE_BASE = 80;

export const Timeline = ({
    onDropExternal,
    clipThumbnails = {},
}) => {
    const containerRef = useRef(null);
    const scrollRef = useRef(null);
    const [dragging, setDragging] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [speedSlider, setSpeedSlider] = useState(null);

    // Zustand store
    const clips = useTimelineStore(s => s.clips);
    const tracks = useTimelineStore(s => s.tracks);
    const currentTime = useTimelineStore(s => s.currentTime);
    const duration = useTimelineStore(s => s.duration);
    const selectedClipId = useTimelineStore(s => s.selectedClipId);
    const isPlaying = useTimelineStore(s => s.isPlaying);
    const zoom = useTimelineStore(s => s.zoom);
    const markers = useTimelineStore(s => s.markers);
    const magneticMode = useTimelineStore(s => s.magneticMode);

    const {
        setSelectedClipId, setCurrentTime, setZoom,
        moveClip, resizeClip,
        addMarker, removeMarker, updateMarker, moveMarker,
        toggleMagneticMode,
    } = useTimelineStore.getState();

    const timeScale = TIME_SCALE_BASE * zoom;
    const totalWidth = Math.max(duration * timeScale + 200, 800);

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    // Close context menu on click elsewhere
    useEffect(() => {
        const close = () => { setContextMenu(null); setSpeedSlider(null); };
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    const handleTimelineClick = useCallback((e) => {
        if (dragging) return;
        if (contextMenu) { setContextMenu(null); return; }
        const rect = scrollRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
        const y = e.clientY - rect.top;
        const trackIndex = Math.floor(y / TRACK_HEIGHT);
        const time = xToTime(x);

        const clickedClip = clips.find(c => {
            if (c.trackIndex !== trackIndex) return false;
            return time >= c.startTime && time < c.startTime + c.duration;
        });

        if (clickedClip) {
            setSelectedClipId(clickedClip.id);
        } else {
            setSelectedClipId(null);
            setCurrentTime(Math.max(0, time));
        }
    }, [clips, dragging, xToTime, setSelectedClipId, setCurrentTime, contextMenu]);

    const handleClipMouseDown = useCallback((e, clip, resizeSide) => {
        e.stopPropagation();
        setSelectedClipId(clip.id);

        if (resizeSide) {
            setDragging({
                type: resizeSide === 'left' ? 'resize-left' : 'resize-right',
                clipId: clip.id,
                startX: e.clientX,
                origStart: clip.startTime,
                origDuration: clip.duration,
            });
        } else {
            setDragging({
                type: 'move',
                clipId: clip.id,
                startX: e.clientX,
                origStart: clip.startTime,
                origTrackIndex: clip.trackIndex,
                origDuration: clip.duration,
            });
        }
    }, [setSelectedClipId]);

    const handleClipContextMenu = useCallback((e, clip) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedClipId(clip.id);
        setContextMenu({ x: e.clientX, y: e.clientY, clip });
    }, [setSelectedClipId]);

    useEffect(() => {
        if (!dragging) return;

        const handleMouseMove = (e) => {
            const dx = e.clientX - dragging.startX;
            const dt = dx / timeScale;

            if (dragging.type === 'move') {
                const newStart = Math.max(0, dragging.origStart + dt);
                const container = scrollRef.current;
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const y = e.clientY - rect.top + container.scrollTop;
                    const newTrack = Math.max(0, Math.min(tracks.length - 1, Math.floor(y / TRACK_HEIGHT)));
                    moveClip(dragging.clipId, newStart, newTrack);
                }
            } else if (dragging.type === 'resize-left') {
                const newDuration = Math.max(0.1, dragging.origDuration - dt);
                resizeClip(dragging.clipId, newDuration, true);
            } else if (dragging.type === 'resize-right') {
                const newDuration = Math.max(0.1, dragging.origDuration + dt);
                resizeClip(dragging.clipId, newDuration, false);
            }
        };

        const handleMouseUp = () => setDragging(null);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, timeScale, tracks, moveClip, resizeClip]);

    // Scroll zoom
    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(z => Math.max(0.1, Math.min(10, z * delta)));
        }
    }, [setZoom]);

    // Render time markers
    const renderTimeMarkers = () => {
        const markers = [];
        const interval = zoom > 2 ? 1 : zoom > 0.5 ? 5 : 10;
        const subInterval = interval / (zoom > 2 ? 5 : zoom > 1 ? 2 : 1);
        const totalDuration = duration + 10;

        for (let t = 0; t < totalDuration; t += subInterval) {
            const x = timeToX(t);
            const isMajor = Math.abs(t % interval) < 0.001;
            markers.push(
                <div key={t} className={`tl-marker ${isMajor ? 'tl-marker-major' : 'tl-marker-minor'}`}
                    style={{ left: x }}>
                    {isMajor && <span className="tl-marker-label">{formatTime(t)}</span>}
                </div>
            );
        }
        return markers;
    };

    // Render a single clip
    const renderClip = (clip) => {
        const x = timeToX(clip.startTime);
        const w = timeToX(clip.duration);
        const isSelected = clip.id === selectedClipId;
        const track = tracks[clip.trackIndex];

        // J/L cut: calculate audio bar position
        const hasJLCut = clip.audioOffset !== 0 || (clip.audioDuration !== null && clip.audioDuration !== clip.duration);
        const audioStartTime = clip.startTime + (clip.audioOffset || 0);
        const audioDur = clip.audioDuration || clip.duration;

        return (
            <div key={clip.id} className="tl-clip-group">
                {/* Main video clip */}
                <div
                    className={`tl-clip ${isSelected ? 'tl-clip-selected' : ''} tl-clip-${clip.type}`}
                    style={{
                        left: x,
                        width: Math.max(w, 8),
                        top: clip.trackIndex * TRACK_HEIGHT + 2,
                        height: TRACK_HEIGHT - 4,
                        backgroundColor: clip.color || 'var(--primary)',
                        opacity: track?.muted ? 0.4 : 1,
                    }}
                    onMouseDown={(e) => handleClipMouseDown(e, clip, null)}
                    onContextMenu={(e) => handleClipContextMenu(e, clip)}
                    onDoubleClick={() => setSpeedSlider({ clipId: clip.id, x: x, y: clip.trackIndex * TRACK_HEIGHT })}
                >
                    <div className="tl-clip-handle tl-clip-handle-left"
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'left')} />
                    <div className="tl-clip-content">
                        <span className="tl-clip-label">{clip.label || clip.type}</span>
                        {(clip.speed ?? 1) !== 1 && <span className="tl-clip-speed">{clip.speed}x</span>}
                        <span className="tl-clip-duration">{formatTime(clip.duration)}</span>
                    </div>
                    {clip.type === 'audio' && (
                        <div className="tl-clip-waveform" style={{ position: 'absolute', left: 8, right: 8, bottom: 6, height: 16, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                            {Array.from({ length: 40 }).map((_, i) => {
                                const h = 15 + Math.sin(i * 0.5) * 30 + Math.sin(i * 1.7) * 20;
                                return <div key={i} style={{ flex: 1, height: `${Math.abs(h)}%`, background: '#10b981', borderRadius: '1px', opacity: 0.7 }} />;
                            })}
                        </div>
                    )}
                    {clipThumbnails[clip.id] && (
                        <div className="tl-clip-thumb" style={{ backgroundImage: `url(${clipThumbnails[clip.id]})` }} />
                    )}
                    {(clip.filters?.length > 0) && (
                        <div className="tl-clip-filters">
                            {clip.filters.map((f, i) => (
                                <span key={i} className="tl-filter-dot" title={f.filterId} />
                            ))}
                        </div>
                    )}
                    {clip.keyframes && Object.keys(clip.keyframes).length > 0 && (
                        <div className="tl-clip-keyframes">
                            {Object.values(clip.keyframes).flat().map((kf, i) => (
                                <div key={i} className="tl-keyframe-dot" style={{ left: `${((kf.time / clip.duration) * 100)}%` }} />
                            ))}
                        </div>
                    )}
                    <div className="tl-clip-handle tl-clip-handle-right"
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'right')} />
                </div>

                {/* J/L cut audio bar */}
                {hasJLCut && (
                    <div
                        className="tl-clip-audio-bar"
                        style={{
                            left: timeToX(audioStartTime),
                            width: Math.max(timeToX(audioDur), 8),
                            top: clip.trackIndex * TRACK_HEIGHT + TRACK_HEIGHT - 10,
                            height: 8,
                        }}
                    >
                        <div className="tl-clip-audio-bar-inner" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="timeline-container" ref={containerRef} onWheel={handleWheel}>
            <div className="tl-content-row">
                {/* Track headers */}
                <div className="tl-track-headers">
                    {tracks.map((track, _i) => (
                        <div key={track.id} className="tl-track-header" style={{ height: TRACK_HEIGHT }}>
                            <span className="tl-track-name">{track.name}</span>
                            <div className="tl-track-controls">
                                <button className={`tl-btn ${track.muted ? 'tl-btn-muted' : ''}`}
                                    onClick={() => useTimelineStore.getState().toggleTrackMute(track.id)} title="Mute"
                                    aria-pressed={!!track.muted} aria-label={`Mute track ${track.id}`}>M</button>
                                <button className={`tl-btn ${track.locked ? 'tl-btn-locked' : ''}`}
                                    onClick={() => useTimelineStore.getState().toggleTrackLock(track.id)} title="Lock"
                                    aria-pressed={!!track.locked} aria-label={`Lock track ${track.id}`}>L</button>
                                {tracks.length > 1 && (
                                    <button className="tl-btn tl-btn-remove"
                                        onClick={() => useTimelineStore.getState().removeTrack(track.id)}
                                        title="Remove Track">-</button>
                                )}
                            </div>
                        </div>
                    ))}
                    <div className="tl-add-track" onClick={() => useTimelineStore.getState().addTrack()}>
                        <span>+ Track</span>
                    </div>
                </div>

                {/* Timeline body */}
                <div className="tl-scroll" ref={scrollRef} onClick={handleTimelineClick}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const clipId = e.dataTransfer.getData('clipId');
                        if (!clipId || !onDropExternal) return;
                        const rect = scrollRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
                        const y = e.clientY - rect.top;
                        const trackIndex = Math.max(0, Math.min(tracks.length - 1, Math.floor(y / TRACK_HEIGHT)));
                        const time = Math.max(0, xToTime(x));
                        onDropExternal(clipId, trackIndex, time);
                    }}>
                    <div className="tl-ruler" style={{ width: totalWidth }}>
                        {renderTimeMarkers()}
                    </div>
                    <div className="tl-tracks" style={{ width: totalWidth }}>
                        {tracks.map((track, _i) => (
                            <div key={track.id} className="tl-track-lane" style={{ height: TRACK_HEIGHT }} />
                        ))}
                    </div>
                    <div className="tl-clips" style={{ width: totalWidth }}>
                        {clips.map(renderClip)}
                    </div>

                    {/* Markers layer */}
                    <MarkerLayer
                        markers={markers}
                        zoom={zoom}
                        currentTime={currentTime}
                        onAddMarker={addMarker}
                        onRemoveMarker={removeMarker}
                        onUpdateMarker={updateMarker}
                        onMoveMarker={moveMarker}
                        onSeek={setCurrentTime}
                    />

                    {/* Playhead */}
                    <Playhead
                        currentTime={currentTime}
                        zoom={zoom}
                        clips={clips}
                        markers={markers}
                        tracks={tracks}
                        duration={duration}
                        onSeek={setCurrentTime}
                    />
                </div>
            </div>

            {/* Speed slider popup */}
            {speedSlider && (() => {
                const clip = clips.find(c => c.id === speedSlider.clipId);
                if (!clip) return null;
                return (
                    <div className="tl-speed-popup" style={{ left: speedSlider.x, top: speedSlider.y + TRACK_HEIGHT }}
                        onClick={e => e.stopPropagation()}>
                        <label>Speed: {clip.speed}x</label>
                        <input type="range" min={0.25} max={4} step={0.25} value={clip.speed}
                            onChange={e => useTimelineStore.getState().updateClip(speedSlider.clipId, { speed: parseFloat(e.target.value) })} />
                        <div className="tl-speed-presets">
                            {[0.5, 1, 1.5, 2].map(s => (
                                <button key={s} className={`tl-btn ${clip.speed === s ? 'active' : ''}`}
                                    onClick={() => useTimelineStore.getState().updateClip(speedSlider.clipId, { speed: s })}>{s}x</button>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Context menu */}
            {contextMenu && (
                <ClipContextMenu
                    x={contextMenu.x} y={contextMenu.y} clip={contextMenu.clip}
                    onClose={() => setContextMenu(null)}
                    onSplit={() => useTimelineStore.getState().splitAtPlayhead()}
                    onDelete={(id) => useTimelineStore.getState().removeClip(id)}
                    onDuplicate={() => {
                        const clip = contextMenu.clip;
                        const { id: _omit, ...rest } = clip;
                        useTimelineStore.getState().addClip(clip.trackIndex, {
                            ...rest,
                            startTime: clip.startTime + clip.duration,
                        });
                    }}
                    onSpeed={(speed) => useTimelineStore.getState().updateClip(contextMenu.clip.id, { speed })}
                    onFilters={() => {}}
                    onKeyframes={() => {}}
                />
            )}

            {/* Transport controls */}
            <div className="tl-transport" role="toolbar" aria-label="Timeline transport controls">
                <button className="tl-transport-btn" onClick={() => { useTimelineStore.getState().setCurrentTime(0); useTimelineStore.getState().isPlaying && useTimelineStore.getState().isPlaying(); }} title="Stop" aria-label="Stop playback">Stop</button>
                <button className="tl-transport-btn tl-transport-play"
                    onClick={() => {
                        const s = useTimelineStore.getState();
                        // Will be wired to play/pause from parent
                    }}
                    aria-label={isPlaying ? 'Pause playback' : 'Play'}>
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
                <span className="tl-transport-time" aria-label={`Current time: ${formatTime(currentTime)}`}>{formatTime(currentTime)}</span>
                <span className="tl-transport-divider">/</span>
                <span className="tl-transport-time tl-transport-duration" aria-label={`Duration: ${formatTime(duration)}`}>{formatTime(duration)}</span>
                <div className="tl-transport-spacer" />
                <button className="tl-transport-btn" onClick={() => useTimelineStore.getState().splitAtPlayhead()} disabled={!selectedClipId} title="Split (S)" aria-label="Split clip at playhead">Split</button>
                <button className="tl-transport-btn" onClick={() => selectedClipId && useTimelineStore.getState().removeClip(selectedClipId)} disabled={!selectedClipId} title="Delete (Del)" aria-label="Delete selected clip">Delete</button>
                <div className="tl-transport-spacer" />
                <button className="tl-transport-btn" onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} title="Zoom Out" aria-label="Zoom timeline out">-</button>
                <span className="tl-zoom-label">{Math.round(zoom * 100)}%</span>
                <button className="tl-transport-btn" onClick={() => setZoom(z => Math.min(10, z * 1.25))} title="Zoom In" aria-label="Zoom timeline in">+</button>
                <div className="tl-transport-spacer" />
                <button className={`tl-transport-btn ${magneticMode ? 'tl-transport-active' : ''}`}
                    onClick={toggleMagneticMode}
                    title={`Magnetic: ${magneticMode ? 'ON' : 'OFF'}`}
                    aria-label={`Toggle magnetic timeline, currently ${magneticMode ? 'on' : 'off'}`}>
                    {magneticMode ? '🧲' : '🧲'} {magneticMode ? 'On' : 'Off'}
                </button>
            </div>
        </div>
    );
};

function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 2: Add J/L cut audio bar CSS**

Add to `src/components/Timeline/Timeline.css` (append):

```css
.tl-clip-group {
    position: relative;
}

.tl-clip-audio-bar {
    position: absolute;
    background: rgba(16, 185, 129, 0.3);
    border: 1px solid rgba(16, 185, 129, 0.5);
    border-radius: 3px;
    z-index: 1;
}

.tl-clip-audio-bar-inner {
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
        90deg,
        rgba(16, 185, 129, 0.4) 0px,
        rgba(16, 185, 129, 0.4) 2px,
        transparent 2px,
        transparent 4px
    );
    border-radius: 2px;
}

.tl-transport-active {
    background: var(--primary, #8b5cf6) !important;
    color: #fff !important;
}
```

- [ ] **Step 3: Verify Timeline renders**

Run: `npm run dev`
Expected: Timeline renders with tracks, clips, playhead, markers, magnetic toggle in transport bar

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline/Timeline.jsx src/components/Timeline/Timeline.css
git commit -m "feat: update Timeline to use Zustand store, Playhead, MarkerLayer, magnetic toggle, J/L cut visual"
```

---

### Task 6: Update useTimeline.js as Thin Wrapper

**Files:**
- Modify: `src/hooks/useTimeline.js`

**Interfaces:**
- Consumes: `useTimelineStore` (from Task 1)
- Produces: `useTimeline()` hook with same API as before (backwards compatible)

- [ ] **Step 1: Replace useTimeline.js content**

Replace entire `src/hooks/useTimeline.js` with:

```js
import { useCallback, useRef, useEffect } from 'react';
import { useTimelineStore } from '../store/timelineStore';

// Thin wrapper around Zustand store for backwards compatibility
// All components should migrate to useTimelineStore directly
export const useTimeline = () => {
    const store = useTimelineStore();
    const videoCacheRef = useRef(new Map());

    const getOrCreateVideo = useCallback((clip) => {
        let video = videoCacheRef.current.get(clip.id);
        if (!video) {
            if (videoCacheRef.current.size >= 2) {
                const first = videoCacheRef.current.keys().next().value;
                const old = videoCacheRef.current.get(first);
                if (old) { old.pause(); old.removeAttribute('src'); old.load(); }
                videoCacheRef.current.delete(first);
            }
            video = document.createElement('video');
            video.muted = true; video.playsInline = true; video.preload = 'metadata';
            const url = clip.sourceUrl || (clip._fileRef ? URL.createObjectURL(clip._fileRef) : null);
            if (!url) return null;
            video.src = url;
            videoCacheRef.current.set(clip.id, video);
        }
        return video;
    }, []);

    // Cleanup video cache on unmount
    useEffect(() => {
        const cache = videoCacheRef.current;
        return () => {
            cache.forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
            cache.clear();
        };
    }, []);

    // Playback — requestAnimationFrame
    const playRafRef = useRef(null);
    const playStartTimeRef = useRef(0);
    const playStartCurrentRef = useRef(0);

    const play = useCallback(() => {
        if (playRafRef.current) return;
        useTimelineStore.setState({ isPlaying: true });
        playStartTimeRef.current = performance.now();
        playStartCurrentRef.current = useTimelineStore.getState().currentTime;

        const tick = () => {
            const elapsed = (performance.now() - playStartTimeRef.current) / 1000;
            const newTime = playStartCurrentRef.current + elapsed;
            const dur = useTimelineStore.getState().duration;
            if (newTime >= dur) {
                useTimelineStore.setState({ currentTime: dur, isPlaying: false });
                playRafRef.current = null;
                return;
            }
            useTimelineStore.setState({ currentTime: newTime });
            playRafRef.current = requestAnimationFrame(tick);
        };
        playRafRef.current = requestAnimationFrame(tick);
    }, []);

    const pause = useCallback(() => {
        if (playRafRef.current) {
            cancelAnimationFrame(playRafRef.current);
            playRafRef.current = null;
        }
        useTimelineStore.setState({ isPlaying: false });
    }, []);

    const stop = useCallback(() => {
        pause();
        useTimelineStore.setState({ currentTime: 0 });
    }, [pause]);

    // Render all timeline clips onto a canvas frame at the given time
    const renderFrame = useCallback((ctx, canvas, time) => {
        const { clips, tracks } = useTimelineStore.getState();
        const { getKeyframedValue } = useTimelineStore.getState();

        // Import FilterEngine inline (avoids circular deps)
        const { FILTERS, buildCSSFilter, getDefaultParams } = require('../utils/FilterEngine');
        const { applyTransition } = require('../utils/Transitions');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;

        const sortedClips = [...clips].sort((a, b) => a.trackIndex - b.trackIndex || a.startTime - b.startTime);

        for (const track of tracks) {
            if (track.muted || !track.visible) continue;
            const trackIdx = tracks.indexOf(track);
            const trackClips = sortedClips.filter(c => c.trackIndex === trackIdx);

            for (let ci = 0; ci < trackClips.length; ci++) {
                const clip = trackClips[ci];
                const clipEnd = clip.startTime + clip.duration;

                if (time < clip.startTime || time >= clipEnd) continue;

                const relTime = time - clip.startTime;

                // --- Transition detection ---
                const transitionDuration = 1.0;
                const endGap = clipEnd - time;

                if (clip.transitions.out && endGap < transitionDuration && ci < trackClips.length - 1) {
                    const nextClip = trackClips[ci + 1];
                    const gap = nextClip.startTime - clipEnd;
                    if (gap <= transitionDuration) {
                        const fromVideo = getOrCreateVideo(clip);
                        const toVideo = getOrCreateVideo(nextClip);
                        if (fromVideo && toVideo && fromVideo.readyState >= 2 && toVideo.readyState >= 2) {
                            const progress = 1 - (endGap / transitionDuration);
                            const fromRel = time - clip.startTime;
                            const toRel = Math.max(0, time - nextClip.startTime);
                            const fromSrc = clip.sourceStart + fromRel * clip.speed;
                            const toSrc = nextClip.sourceStart + toRel * nextClip.speed;
                            if (Math.abs(fromVideo.currentTime - fromSrc) > 0.1) fromVideo.currentTime = fromSrc;
                            if (Math.abs(toVideo.currentTime - toSrc) > 0.1) toVideo.currentTime = toSrc;
                            applyTransition(clip.transitions.out, ctx, canvas, fromVideo, toVideo, progress);
                        }
                        continue;
                    }
                }

                // --- Build merged filter params with keyframe overrides ---
                const resolvedFilters = (clip.filters || []).map(f => {
                    const merged = { ...f.params };
                    if (clip.keyframes) {
                        for (const [paramKey] of Object.entries(clip.keyframes)) {
                            if (paramKey.startsWith(f.filterId + '.')) {
                                const subKey = paramKey.slice(f.filterId.length + 1);
                                const val = getKeyframedValue(clip, paramKey, time);
                                if (val !== undefined) merged[subKey] = val;
                            }
                        }
                    }
                    return { filterId: f.filterId, params: merged };
                });

                // --- Draw the clip frame ---
                const video = getOrCreateVideo(clip);

                if (video && video.readyState >= 2) {
                    const sourceTime = clip.sourceStart + relTime * clip.speed;

                    ctx.save();

                    // Apply transform filters
                    resolvedFilters.forEach(f => {
                        if (['mirror', 'flip', 'rotate'].includes(f.filterId)) {
                            const filterObj = FILTERS[f.filterId];
                            if (filterObj && filterObj.apply) {
                                filterObj.apply(ctx, canvas, { ...getDefaultParams(f.filterId), ...f.params });
                            }
                        }
                    });

                    // Handle crop
                    const cropF = resolvedFilters.find(f => f.filterId === 'crop');
                    const cropX = cropF?.params?.x || 0;
                    const cropY = cropF?.params?.y || 0;
                    const cropW = cropF?.params?.w || video.videoWidth;
                    const cropH = cropF?.params?.h || video.videoHeight;

                    if (Math.abs(video.currentTime - sourceTime) > 0.1) {
                        video.currentTime = sourceTime;
                    }

                    const cssFilter = buildCSSFilter(resolvedFilters);
                    if (cssFilter && cssFilter !== 'none') {
                        ctx.filter = cssFilter;
                    }

                    if (cropF) {
                        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
                    } else {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    }
                    ctx.filter = 'none';

                    // Apply image-data filters
                    resolvedFilters.forEach(f => {
                        if (['opacity', 'pixelate', 'sharpen', 'curves', 'levels',
                             'liftgammagain', 'posterize', 'cartoon', 'glow', 'emboss',
                             'charcoal', 'chromakey', 'white-balance', 'color-grade'].includes(f.filterId)) {
                            const filterObj = FILTERS[f.filterId];
                            if (filterObj && filterObj.apply) {
                                ctx.save();
                                filterObj.apply(ctx, canvas, { ...getDefaultParams(f.filterId), ...f.params });
                                ctx.restore();
                            }
                        }
                    });

                    // Apply post-draw overlay filters
                    resolvedFilters.forEach(f => {
                        if (['vignette', 'border', 'temperature', 'tint', 'noise',
                             'filmgrain', 'oldfilm'].includes(f.filterId)) {
                            const filterObj = FILTERS[f.filterId];
                            if (filterObj && filterObj.apply) {
                                ctx.save();
                                filterObj.apply(ctx, canvas, { ...getDefaultParams(f.filterId), ...f.params });
                                ctx.restore();
                            }
                        }
                    });

                    ctx.restore();
                } else if (video) {
                    ctx.save();
                    ctx.fillStyle = clip.color || '#8b5cf6';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#fff';
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.fillStyle = clip.color || '#8b5cf6';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#fff';
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(clip.label || 'No source', canvas.width / 2, canvas.height / 2);
                    ctx.restore();
                }
            }
        }
    }, [getOrCreateVideo]);

    return {
        clips: store.clips,
        tracks: store.tracks,
        currentTime: store.currentTime,
        duration: store.duration,
        selectedClipId: store.selectedClipId,
        isPlaying: store.isPlaying,
        zoom: store.zoom,
        canUndo: store.canUndo,
        canRedo: store.canRedo,

        setSelectedClipId: store.setSelectedClipId,
        setCurrentTime: store.setCurrentTime,
        setZoom: store.setZoom,
        addClip: store.addClip,
        removeClip: store.removeClip,
        updateClip: store.updateClip,
        moveClip: store.moveClip,
        resizeClip: store.resizeClip,
        splitAtPlayhead: store.splitAtPlayhead,
        addTrack: store.addTrack,
        removeTrack: store.removeTrack,
        toggleTrackMute: store.toggleTrackMute,
        toggleTrackLock: store.toggleTrackLock,
        addKeyframe: store.addKeyframe,
        removeKeyframe: store.removeKeyframe,
        undo: store.undo,
        redo: store.redo,

        play, pause, stop,
        renderFrame,
        getOrCreateVideo,
        videoCacheRef,
        loadProject: store.loadProject,
    };
};
```

- [ ] **Step 2: Verify backwards compatibility**

Run: `npm run dev`
Expected: All existing components that import `useTimeline` still work

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTimeline.js
git commit -m "refactor: useTimeline now wraps Zustand store for backwards compatibility"
```

---

### Task 7: Update EditMode to Use Keyboard Shortcuts & Zustand

**Files:**
- Modify: `src/components/EditMode/EditMode.jsx`

**Interfaces:**
- Consumes: `useTimelineKeyboard` (from Task 2), `useTimelineStore` (from Task 1)
- Produces: Updated EditMode that activates keyboard shortcuts

- [ ] **Step 1: Add useTimelineKeyboard to EditMode**

In `src/components/EditMode/EditMode.jsx`, find the `useEffect` block that registers keyboard shortcuts (the one with `handleKeyDown`). Replace it with:

```js
// In the imports section, add:
import { useTimelineKeyboard } from '../../hooks/useTimelineKeyboard';
import { useTimelineStore } from '../../store/timelineStore';

// After the timeline hook setup, add:
useTimelineKeyboard({
    play,
    pause,
    isPlaying: useTimelineStore(s => s.isPlaying),
    videoCacheRef,
});
```

- [ ] **Step 2: Remove old keyboard handler**

In EditMode.jsx, find and remove the old `useEffect(() => { const handleKeyDown = (e) => { ... }; window.addEventListener('keydown', handleKeyDown); ... })` block that was duplicating keyboard shortcuts.

- [ ] **Step 3: Update project load to use store**

Where EditMode loads a project from server, change to use:

```js
useTimelineStore.getState().loadProject(project.clips, project.tracks);
```

Instead of the old manual setState calls.

- [ ] **Step 4: Verify**

Run: `npm run dev`
Expected: Keyboard shortcuts work in editor: Space, S, Delete, J/K/L, Q/W, M, Ctrl+Z

- [ ] **Step 5: Commit**

```bash
git add src/components/EditMode/EditMode.jsx
git commit -m "feat: wire keyboard shortcuts and Zustand store into EditMode"
```

---

### Task 8: RightPanel Updates — Markers List & Magnetic Toggle

**Files:**
- Modify: `src/components/RightPanel/RightPanel.jsx`

**Interfaces:**
- Consumes: `useTimelineStore` (from Task 1)
- Produces: RightPanel showing markers list, magnetic mode toggle

- [ ] **Step 1: Add Markers section to RightPanel**

In `src/components/RightPanel/RightPanel.jsx`, add a new section after the existing clip properties:

```jsx
// Add at top:
import { useTimelineStore } from '../../store/timelineStore';

// Inside the component, add:
const markers = useTimelineStore(s => s.markers);
const magneticMode = useTimelineStore(s => s.magneticMode);
const toggleMagneticMode = useTimelineStore(s => s.toggleMagneticMode);
const addMarker = useTimelineStore(s => s.addMarker);
const removeMarker = useTimelineStore(s => s.removeMarker);

// Add JSX section:
<div className="rp-section">
    <h3>Markers</h3>
    <div className="rp-markers-list">
        {markers.length === 0 ? (
            <div className="rp-empty">No markers. Press M on timeline to add.</div>
        ) : (
            markers.sort((a, b) => a.time - b.time).map(m => (
                <div key={m.id} className="rp-marker-item">
                    <div className="rp-marker-color" style={{ background: m.color }} />
                    <span className="rp-marker-time">{formatTime(m.time)}</span>
                    <span className="rp-marker-label">{m.label || 'Untitled'}</span>
                    <button className="rp-marker-remove" onClick={() => removeMarker(m.id)}>x</button>
                </div>
            ))
        )}
    </div>
</div>

<div className="rp-section">
    <h3>Timeline Settings</h3>
    <label className="rp-toggle">
        <input type="checkbox" checked={magneticMode} onChange={toggleMagneticMode} />
        <span>Magnetic Timeline (Auto-Ripple)</span>
    </label>
</div>
```

- [ ] **Step 2: Add CSS for markers list**

```css
.rp-markers-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.rp-marker-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: var(--bg-tertiary, #2a2a3a);
    border-radius: 4px;
    font-size: 12px;
}

.rp-marker-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.rp-marker-time {
    color: var(--text-secondary, #aaa);
    font-family: monospace;
    min-width: 40px;
}

.rp-marker-label {
    flex: 1;
    color: var(--text-primary, #fff);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.rp-marker-remove {
    background: none;
    border: none;
    color: var(--text-secondary, #aaa);
    cursor: pointer;
    padding: 2px 4px;
}

.rp-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RightPanel/RightPanel.jsx
git commit -m "feat: add markers list and magnetic mode toggle to RightPanel"
```

---

### Task 9: Update ClipContextMenu for J/L Cuts

**Files:**
- Modify: `src/components/Timeline/ClipContextMenu.jsx`

**Interfaces:**
- Consumes: `useTimelineStore` (from Task 1)
- Produces: Context menu with J/L cut options

- [ ] **Step 1: Add J/L cut options to context menu**

In `src/components/Timeline/ClipContextMenu.jsx`, add menu items:

```jsx
// Add at top:
import { useTimelineStore } from '../../store/timelineStore';

// Add to the menu items:
<div className="ctx-separator" />
<button className="ctx-item" onClick={() => {
    // J-cut: audio starts before video
    const clip = contextMenu.clip;
    const offset = Math.max(-clip.startTime, -2);
    useTimelineStore.getState().setAudioOffset(clip.id, offset);
    onClose();
}}>
    J-Cut (Audio Before Video)
</button>
<button className="ctx-item" onClick={() => {
    // L-cut: video ends before audio
    const clip = contextMenu.clip;
    useTimelineStore.getState().setAudioOffset(clip.id, 0);
    useTimelineStore.getState().setAudioDuration(clip.id, clip.duration + 2);
    onClose();
}}>
    L-Cut (Video Ends Before Audio)
</button>
<button className="ctx-item" onClick={() => {
    // Reset J/L cut
    const clip = contextMenu.clip;
    useTimelineStore.getState().setAudioOffset(clip.id, 0);
    useTimelineStore.getState().setAudioDuration(clip.id, null);
    onClose();
}}>
    Reset Audio Timing
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Timeline/ClipContextMenu.jsx
git commit -m "feat: add J-cut, L-cut, and reset audio timing to clip context menu"
```

---

### Task 10: Integration Test & Bug Fixes

**Files:**
- Modify: various (fix issues found during testing)

- [ ] **Step 1: Start dev server and test all features**

Run: `npm run dev`

Manual test checklist:
1. Import a video clip → appears on timeline
2. Click clip → selects, RightPanel shows properties
3. Press Space → plays/pauses
4. Press S → splits clip at playhead
5. Press Delete → deletes clip with ripple (gap closes)
6. Press J → shuttle backward, press again → faster
7. Press L → shuttle forward, press again → faster
8. Press K → stops shuttle
9. Press Q → trims clip start to playhead
10. Press W → trims clip end to playhead
11. Press M → drops marker on ruler
12. Double-click marker → popup to name it
13. Right-click marker → deletes it
14. Magnetic toggle ON → delete closes gap
15. Magnetic toggle OFF → delete leaves gap
16. Ctrl+Z → undo
17. Ctrl+Shift+Z → redo
18. Scroll zoom → timeline zooms in/out
19. Clip context menu → J-Cut, L-Cut options
20. J/L cut → audio bar appears below clip
21. Markers list in RightPanel shows all markers

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new errors (35 pre-existing is OK)

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: integration fixes for Phase 1 timeline features"
```

---

## Summary

| Task | What It Builds | Files Created | Files Modified |
|------|---------------|---------------|----------------|
| 1 | Zustand store | `src/store/timelineStore.js` | package.json |
| 2 | Keyboard shortcuts | `src/hooks/useTimelineKeyboard.js` | — |
| 3 | Playhead with snapping | `Playhead.jsx`, `Playhead.css` | — |
| 4 | Markers & popup | `MarkerLayer.jsx`, `MarkerPopup.jsx`, CSS files | — |
| 5 | Timeline integration | — | `Timeline.jsx`, `Timeline.css` |
| 6 | useTimeline wrapper | — | `useTimeline.js` |
| 7 | EditMode wiring | — | `EditMode.jsx` |
| 8 | RightPanel markers | — | `RightPanel.jsx` |
| 9 | Context menu J/L cuts | — | `ClipContextMenu.jsx` |
| 10 | Integration testing | — | various |
