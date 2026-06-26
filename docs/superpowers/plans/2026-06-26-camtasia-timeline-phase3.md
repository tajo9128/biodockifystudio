# Phase 3: Screencast Tracks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Zoom-n-Pan, Cursor, Annotations, and Animations tracks to the timeline — specialized tracks for screencast/tutorial content.

**Architecture:** Each track type is a React component rendered on its own track lane. Track model extended with new types. Zoom-n-Pan uses canvas rectangles. Cursor track shows click markers. Annotations track shows draggable callout blocks. Animations track shows enter/emphasis/exit blocks.

**Tech Stack:** React 19, Zustand, HTML5 Canvas

## Global Constraints
- Browser-based React SPA, no server changes
- Must preserve all Phase 1+2 features
- No new npm dependencies

---

### Task 1: Extend Track Model for Screencast Types

**Files:**
- Modify: `src/store/timelineStore.js`

- [ ] **Step 1: Add new track types to default tracks**

Read `src/store/timelineStore.js`. Find the default `tracks` array. Add screencast track types:

```js
tracks: [
    { id: 'track_0', name: 'Video 1', type: 'video', muted: false, locked: false, visible: true },
    { id: 'track_1', name: 'Video 2', type: 'video', muted: false, locked: false, visible: true },
    { id: 'track_2', name: 'Screen', type: 'video', muted: false, locked: false, visible: true },
    { id: 'track_3', name: 'Webcam', type: 'video', muted: false, locked: false, visible: true },
    { id: 'track_4', name: 'Audio', type: 'audio', muted: false, locked: false, visible: true },
    { id: 'track_zoom', name: 'Zoom-n-Pan', type: 'zoom-pan', muted: false, locked: false, visible: true },
    { id: 'track_cursor', name: 'Cursor', type: 'cursor', muted: false, locked: false, visible: true },
    { id: 'track_annotations', name: 'Annotations', type: 'annotations', muted: false, locked: false, visible: true },
    { id: 'track_animations', name: 'Animations', type: 'animations', muted: false, locked: false, visible: true },
],
```

- [ ] **Step 2: Add zoom-pan region actions to store**

Add these actions to the Zustand store:

```js
// Zoom-pan regions
zoomPanRegions: [],

addZoomPanRegion: (region) => {
    const id = `zp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set(state => ({
        zoomPanRegions: [...state.zoomPanRegions, { id, ...region }],
    }));
    return id;
},

updateZoomPanRegion: (id, updates) => {
    set(state => ({
        zoomPanRegions: state.zoomPanRegions.map(r => r.id === id ? { ...r, ...updates } : r),
    }));
},

removeZoomPanRegion: (id) => {
    set(state => ({
        zoomPanRegions: state.zoomPanRegions.filter(r => r.id !== id),
    }));
},

// Cursor events
cursorEvents: [],

addCursorEvent: (event) => {
    const id = `cursor_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set(state => ({
        cursorEvents: [...state.cursorEvents, { id, ...event }],
    }));
    return id;
},

updateCursorEvent: (id, updates) => {
    set(state => ({
        cursorEvents: state.cursorEvents.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
},

removeCursorEvent: (id) => {
    set(state => ({
        cursorEvents: state.cursorEvents.filter(e => e.id !== id),
    }));
},

// Annotations/callouts
annotations: [],

addAnnotation: (annotation) => {
    const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set(state => ({
        annotations: [...state.annotations, { id, ...annotation }],
    }));
    return id;
},

updateAnnotation: (id, updates) => {
    set(state => ({
        annotations: state.annotations.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
},

removeAnnotation: (id) => {
    set(state => ({
        annotations: state.annotations.filter(a => a.id !== id),
    }));
},

// Animations
animations: [],

addAnimation: (animation) => {
    const id = `anim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set(state => ({
        animations: [...state.animations, { id, ...animation }],
    }));
    return id;
},

updateAnimation: (id, updates) => {
    set(state => ({
        animations: state.animations.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
},

removeAnimation: (id) => {
    set(state => ({
        animations: state.animations.filter(a => a.id !== id),
    }));
},
```

- [ ] **Step 3: Commit**

```bash
git add src/store/timelineStore.js
git commit -m "feat: add screencast track types and zoom-pan/cursor/annotations/animations state to store"
```

---

### Task 2: ZoomPanTrack Component

**Files:**
- Create: `src/components/Timeline/ZoomPanTrack.jsx`
- Create: `src/components/Timeline/ZoomPanTrack.css`

- [ ] **Step 1: Create ZoomPanTrack.jsx**

Renders zoom regions as colored blocks on the zoom-n-pan track lane.

```jsx
import React, { useState, useCallback, useRef } from 'react';
import './ZoomPanTrack.css';

const TIME_SCALE_BASE = 80;

const ZOOM_REGION_COLORS = [
    '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
];

export const ZoomPanTrack = ({
    regions,
    zoom,
    trackHeight,
    onAddRegion,
    onUpdateRegion,
    onRemoveRegion,
}) => {
    const [dragging, setDragging] = useState(null);
    const [creating, setCreating] = useState(null);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    const handleMouseDown = useCallback((e, region, side) => {
        e.stopPropagation();
        if (side === 'left') {
            setDragging({ id: region.id, side: 'left', startX: e.clientX, origStart: region.startTime, origDuration: region.duration });
        } else if (side === 'right') {
            setDragging({ id: region.id, side: 'right', startX: e.clientX, origStart: region.startTime, origDuration: region.duration });
        } else {
            setDragging({ id: region.id, side: 'move', startX: e.clientX, origStart: region.startTime });
        }
    }, []);

    const handleDoubleClick = useCallback((e, region) => {
        e.stopPropagation();
        onRemoveRegion?.(region.id);
    }, [onRemoveRegion]);

    // Handle creation drag
    const handleTrackMouseDown = useCallback((e) => {
        if (dragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, xToTime(x));
        setCreating({ startX: e.clientX, startTime: time });
    }, [dragging, xToTime]);

    React.useEffect(() => {
        if (!creating) return;
        const handleMouseMove = (e) => {
            const dx = e.clientX - creating.startX;
            const dt = dx / timeScale;
            const duration = Math.max(0.5, Math.abs(dt));
            const startTime = dt >= 0 ? creating.startTime : creating.startTime + dt;
            setCreating(prev => ({ ...prev, duration, startTime }));
        };
        const handleMouseUp = () => {
            if (creating && creating.duration > 0.5) {
                const color = ZOOM_REGION_COLORS[Math.floor(Math.random() * ZOOM_REGION_COLORS.length)];
                onAddRegion?.({
                    startTime: creating.startTime,
                    duration: creating.duration,
                    startRect: { x: 0, y: 0, width: 100, height: 100 },
                    endRect: { x: 25, y: 25, width: 50, height: 50 },
                    color,
                });
            }
            setCreating(null);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [creating, timeScale, onAddRegion]);

    React.useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e) => {
            const dx = e.clientX - dragging.startX;
            const dt = dx / timeScale;

            if (dragging.side === 'move') {
                onUpdateRegion?.(dragging.id, { startTime: Math.max(0, dragging.origStart + dt) });
            } else if (dragging.side === 'left') {
                const newStart = Math.max(0, dragging.origStart + dt);
                const newDuration = Math.max(0.5, dragging.origDuration - dt);
                onUpdateRegion?.(dragging.id, { startTime: newStart, duration: newDuration });
            } else if (dragging.side === 'right') {
                const newDuration = Math.max(0.5, dragging.origDuration + dt);
                onUpdateRegion?.(dragging.id, { duration: newDuration });
            }
        };
        const handleMouseUp = () => setDragging(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, timeScale, onUpdateRegion]);

    return (
        <div
            className="tl-zoompan-track"
            style={{ height: trackHeight }}
            onMouseDown={handleTrackMouseDown}
        >
            {regions.map(region => (
                <div
                    key={region.id}
                    className="tl-zoompan-region"
                    style={{
                        left: timeToX(region.startTime),
                        width: Math.max(timeToX(region.duration), 12),
                        backgroundColor: region.color || '#f59e0b',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, region, null)}
                    onDoubleClick={(e) => handleDoubleClick(e, region)}
                >
                    <div className="tl-zoompan-handle tl-zoompan-handle-left"
                        onMouseDown={(e) => handleMouseDown(e, region, 'left')} />
                    <div className="tl-zoompan-label">
                        Zoom
                    </div>
                    <div className="tl-zoompan-handle tl-zoompan-handle-right"
                        onMouseDown={(e) => handleMouseDown(e, region, 'right')} />
                </div>
            ))}

            {creating && creating.duration > 0 && (
                <div
                    className="tl-zoompan-region tl-zoompan-creating"
                    style={{
                        left: timeToX(creating.startTime),
                        width: Math.max(timeToX(creating.duration), 12),
                    }}
                />
            )}
        </div>
    );
};
```

- [ ] **Step 2: Create ZoomPanTrack.css**

```css
.tl-zoompan-track {
    position: relative;
    background: rgba(245, 158, 11, 0.05);
    border-top: 1px solid rgba(245, 158, 11, 0.2);
}

.tl-zoompan-region {
    position: absolute;
    top: 4px;
    height: calc(100% - 8px);
    border-radius: 4px;
    display: flex;
    align-items: center;
    cursor: grab;
    opacity: 0.8;
    overflow: hidden;
}

.tl-zoompan-region:hover {
    opacity: 1;
}

.tl-zoompan-creating {
    background: rgba(245, 158, 11, 0.3) !important;
    border: 1px dashed #f59e0b;
}

.tl-zoompan-handle {
    width: 6px;
    height: 100%;
    cursor: ew-resize;
    flex-shrink: 0;
}

.tl-zoompan-handle-left {
    border-radius: 4px 0 0 4px;
}

.tl-zoompan-handle-right {
    border-radius: 0 4px 4px 0;
}

.tl-zoompan-label {
    flex: 1;
    text-align: center;
    font-size: 11px;
    color: #000;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline/ZoomPanTrack.jsx src/components/Timeline/ZoomPanTrack.css
git commit -m "feat: add ZoomPanTrack with draggable zoom regions"
```

---

### Task 3: CursorTrack Component

**Files:**
- Create: `src/components/Timeline/CursorTrack.jsx`
- Create: `src/components/Timeline/CursorTrack.css`

- [ ] **Step 1: Create CursorTrack.jsx**

Renders cursor click events as markers on the cursor track.

```jsx
import React, { useState, useCallback } from 'react';
import './CursorTrack.css';

const TIME_SCALE_BASE = 80;

const CURSOR_EFFECTS = ['none', 'highlight', 'magnify', 'smooth'];

export const CursorTrack = ({
    events,
    zoom,
    trackHeight,
    onAddEvent,
    onUpdateEvent,
    onRemoveEvent,
}) => {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    const handleTrackClick = useCallback((e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, xToTime(x));
        onAddEvent?.({
            time,
            type: 'click',
            effect: 'none',
            x: 0.5,
            y: 0.5,
        });
    }, [xToTime, onAddEvent]);

    return (
        <div
            className="tl-cursor-track"
            style={{ height: trackHeight }}
            onClick={handleTrackClick}
        >
            {events.map(event => (
                <div
                    key={event.id}
                    className={`tl-cursor-marker tl-cursor-${event.type} ${event.effect !== 'none' ? 'tl-cursor-effect-' + event.effect : ''}`}
                    style={{ left: timeToX(event.time) }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(selectedEvent === event.id ? null : event.id);
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        onRemoveEvent?.(event.id);
                    }}
                    title={`${event.type} - ${event.effect}`}
                >
                    <div className="tl-cursor-dot" />
                    {event.effect !== 'none' && (
                        <div className="tl-cursor-effect-badge">{event.effect[0].toUpperCase()}</div>
                    )}
                </div>
            ))}

            {selectedEvent && (() => {
                const event = events.find(e => e.id === selectedEvent);
                if (!event) return null;
                return (
                    <div className="tl-cursor-popup" style={{ left: timeToX(event.time) }}>
                        <select
                            value={event.effect}
                            onChange={(e) => {
                                onUpdateEvent?.(event.id, { effect: e.target.value });
                                setSelectedEvent(null);
                            }}
                        >
                            {CURSOR_EFFECTS.map(fx => (
                                <option key={fx} value={fx}>{fx}</option>
                            ))}
                        </select>
                    </div>
                );
            })()}
        </div>
    );
};
```

- [ ] **Step 2: Create CursorTrack.css**

```css
.tl-cursor-track {
    position: relative;
    background: rgba(59, 130, 246, 0.05);
    border-top: 1px solid rgba(59, 130, 246, 0.2);
}

.tl-cursor-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    cursor: pointer;
    z-index: 2;
}

.tl-cursor-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3b82f6;
    border: 2px solid #fff;
}

.tl-cursor-click .tl-cursor-dot {
    background: #3b82f6;
}

.tl-cursor-move .tl-cursor-dot {
    background: #10b981;
}

.tl-cursor-effect-highlight .tl-cursor-dot {
    background: #f59e0b;
    box-shadow: 0 0 8px #f59e0b;
}

.tl-cursor-effect-magnify .tl-cursor-dot {
    background: #ef4444;
    box-shadow: 0 0 8px #ef4444;
}

.tl-cursor-effect-smooth .tl-cursor-dot {
    background: #8b5cf6;
    box-shadow: 0 0 8px #8b5cf6;
}

.tl-cursor-effect-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #000;
    color: #fff;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tl-cursor-popup {
    position: absolute;
    top: -30px;
    transform: translateX(-50%);
    background: var(--bg-secondary, #1e1e2e);
    border: 1px solid var(--border, #333);
    border-radius: 4px;
    padding: 4px;
    z-index: 10;
}

.tl-cursor-popup select {
    background: var(--bg-primary, #12121a);
    color: var(--text-primary, #fff);
    border: 1px solid var(--border, #333);
    border-radius: 3px;
    font-size: 11px;
    padding: 2px 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline/CursorTrack.jsx src/components/Timeline/CursorTrack.css
git commit -m "feat: add CursorTrack with click markers and effect badges"
```

---

### Task 4: AnnotationsTrack Component

**Files:**
- Create: `src/components/Timeline/AnnotationsTrack.jsx`
- Create: `src/components/Timeline/AnnotationsTrack.css`

- [ ] **Step 1: Create AnnotationsTrack.jsx**

Renders annotation callout blocks on the annotations track.

```jsx
import React, { useState, useCallback } from 'react';
import './AnnotationsTrack.css';

const TIME_SCALE_BASE = 80;

const CALLOUT_TYPES = ['text', 'arrow', 'blur', 'shape'];
const CALLOUT_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export const AnnotationsTrack = ({
    annotations,
    zoom,
    trackHeight,
    onAddAnnotation,
    onUpdateAnnotation,
    onRemoveAnnotation,
}) => {
    const [dragging, setDragging] = useState(null);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    const handleTrackClick = useCallback((e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, xToTime(x));
        const color = CALLOUT_COLORS[Math.floor(Math.random() * CALLOUT_COLORS.length)];
        onAddAnnotation?.({
            startTime: time,
            duration: 3,
            type: 'text',
            text: 'Callout',
            color,
            x: 0.5,
            y: 0.5,
            fontSize: 24,
        });
    }, [xToTime, onAddAnnotation]);

    const handleMouseDown = useCallback((e, ann, side) => {
        e.stopPropagation();
        if (side === 'left') {
            setDragging({ id: ann.id, side: 'left', startX: e.clientX, origStart: ann.startTime, origDuration: ann.duration });
        } else if (side === 'right') {
            setDragging({ id: ann.id, side: 'right', startX: e.clientX, origStart: ann.startTime, origDuration: ann.duration });
        } else {
            setDragging({ id: ann.id, side: 'move', startX: e.clientX, origStart: ann.startTime });
        }
    }, []);

    React.useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e) => {
            const dx = e.clientX - dragging.startX;
            const dt = dx / timeScale;

            if (dragging.side === 'move') {
                onUpdateAnnotation?.(dragging.id, { startTime: Math.max(0, dragging.origStart + dt) });
            } else if (dragging.side === 'left') {
                const newStart = Math.max(0, dragging.origStart + dt);
                const newDuration = Math.max(0.5, dragging.origDuration - dt);
                onUpdateAnnotation?.(dragging.id, { startTime: newStart, duration: newDuration });
            } else if (dragging.side === 'right') {
                onUpdateAnnotation?.(dragging.id, { duration: Math.max(0.5, dragging.origDuration + dt) });
            }
        };
        const handleMouseUp = () => setDragging(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, timeScale, onUpdateAnnotation]);

    return (
        <div
            className="tl-annotations-track"
            style={{ height: trackHeight }}
            onClick={handleTrackClick}
        >
            {annotations.map(ann => (
                <div
                    key={ann.id}
                    className={`tl-annotation-block tl-annotation-${ann.type}`}
                    style={{
                        left: timeToX(ann.startTime),
                        width: Math.max(timeToX(ann.duration), 20),
                        backgroundColor: ann.color || '#f59e0b',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, ann, null)}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        onRemoveAnnotation?.(ann.id);
                    }}
                >
                    <div className="tl-annotation-handle tl-annotation-handle-left"
                        onMouseDown={(e) => handleMouseDown(e, ann, 'left')} />
                    <div className="tl-annotation-content">
                        <span className="tl-annotation-type">{ann.type}</span>
                        <span className="tl-annotation-text">{ann.text || ''}</span>
                    </div>
                    <div className="tl-annotation-handle tl-annotation-handle-right"
                        onMouseDown={(e) => handleMouseDown(e, ann, 'right')} />
                </div>
            ))}
        </div>
    );
};
```

- [ ] **Step 2: Create AnnotationsTrack.css**

```css
.tl-annotations-track {
    position: relative;
    background: rgba(139, 92, 246, 0.05);
    border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.tl-annotation-block {
    position: absolute;
    top: 4px;
    height: calc(100% - 8px);
    border-radius: 4px;
    display: flex;
    align-items: center;
    cursor: grab;
    opacity: 0.85;
    overflow: hidden;
}

.tl-annotation-block:hover {
    opacity: 1;
}

.tl-annotation-handle {
    width: 6px;
    height: 100%;
    cursor: ew-resize;
    flex-shrink: 0;
}

.tl-annotation-handle-left {
    border-radius: 4px 0 0 4px;
}

.tl-annotation-handle-right {
    border-radius: 0 4px 4px 0;
}

.tl-annotation-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px;
    overflow: hidden;
}

.tl-annotation-type {
    font-size: 9px;
    text-transform: uppercase;
    opacity: 0.7;
    color: #000;
}

.tl-annotation-text {
    font-size: 11px;
    color: #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tl-annotation-arrow {
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline/AnnotationsTrack.jsx src/components/Timeline/AnnotationsTrack.css
git commit -m "feat: add AnnotationsTrack with draggable callout blocks"
```

---

### Task 5: AnimationsTrack Component

**Files:**
- Create: `src/components/Timeline/AnimationsTrack.jsx`
- Create: `src/components/Timeline/AnimationsTrack.css`

- [ ] **Step 1: Create AnimationsTrack.jsx**

Renders enter/emphasis/exit animation blocks.

```jsx
import React, { useState, useCallback } from 'react';
import './AnimationsTrack.css';

const TIME_SCALE_BASE = 80;

const ANIMATION_TYPES = [
    { id: 'fade-in', label: 'Fade In', color: '#10b981' },
    { id: 'fade-out', label: 'Fade Out', color: '#ef4444' },
    { id: 'slide-in-left', label: 'Slide In', color: '#3b82f6' },
    { id: 'slide-out-right', label: 'Slide Out', color: '#f59e0b' },
    { id: 'scale-in', label: 'Scale In', color: '#8b5cf6' },
    { id: 'scale-out', label: 'Scale Out', color: '#ec4899' },
    { id: 'emphasis', label: 'Emphasis', color: '#f59e0b' },
];

export const AnimationsTrack = ({
    animations,
    zoom,
    trackHeight,
    onAddAnimation,
    onUpdateAnimation,
    onRemoveAnimation,
}) => {
    const [dragging, setDragging] = useState(null);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);
    const xToTime = useCallback((x) => x / timeScale, [timeScale]);

    const handleTrackClick = useCallback((e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, xToTime(x));
        const animType = ANIMATION_TYPES[0];
        onAddAnimation?.({
            startTime: time,
            duration: 1.0,
            type: animType.id,
            targetClipId: null,
        });
    }, [xToTime, onAddAnimation]);

    const handleMouseDown = useCallback((e, anim, side) => {
        e.stopPropagation();
        if (side === 'left') {
            setDragging({ id: anim.id, side: 'left', startX: e.clientX, origStart: anim.startTime, origDuration: anim.duration });
        } else if (side === 'right') {
            setDragging({ id: anim.id, side: 'right', startX: e.clientX, origStart: anim.startTime, origDuration: anim.duration });
        } else {
            setDragging({ id: anim.id, side: 'move', startX: e.clientX, origStart: anim.startTime });
        }
    }, []);

    React.useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e) => {
            const dx = e.clientX - dragging.startX;
            const dt = dx / timeScale;

            if (dragging.side === 'move') {
                onUpdateAnimation?.(dragging.id, { startTime: Math.max(0, dragging.origStart + dt) });
            } else if (dragging.side === 'left') {
                const newStart = Math.max(0, dragging.origStart + dt);
                const newDuration = Math.max(0.2, dragging.origDuration - dt);
                onUpdateAnimation?.(dragging.id, { startTime: newStart, duration: newDuration });
            } else if (dragging.side === 'right') {
                onUpdateAnimation?.(dragging.id, { duration: Math.max(0.2, dragging.origDuration + dt) });
            }
        };
        const handleMouseUp = () => setDragging(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, timeScale, onUpdateAnimation]);

    return (
        <div
            className="tl-animations-track"
            style={{ height: trackHeight }}
            onClick={handleTrackClick}
        >
            {animations.map(anim => {
                const animDef = ANIMATION_TYPES.find(a => a.id === anim.type) || ANIMATION_TYPES[0];
                return (
                    <div
                        key={anim.id}
                        className="tl-animation-block"
                        style={{
                            left: timeToX(anim.startTime),
                            width: Math.max(timeToX(anim.duration), 16),
                            backgroundColor: animDef.color,
                        }}
                        onMouseDown={(e) => handleMouseDown(e, anim, null)}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onRemoveAnimation?.(anim.id);
                        }}
                    >
                        <div className="tl-animation-handle tl-animation-handle-left"
                            onMouseDown={(e) => handleMouseDown(e, anim, 'left')} />
                        <div className="tl-animation-content">
                            <span className="tl-animation-label">{animDef.label}</span>
                        </div>
                        <div className="tl-animation-handle tl-animation-handle-right"
                            onMouseDown={(e) => handleMouseDown(e, anim, 'right')} />
                    </div>
                );
            })}
        </div>
    );
};
```

- [ ] **Step 2: Create AnimationsTrack.css**

```css
.tl-animations-track {
    position: relative;
    background: rgba(16, 185, 129, 0.05);
    border-top: 1px solid rgba(16, 185, 129, 0.2);
}

.tl-animation-block {
    position: absolute;
    top: 4px;
    height: calc(100% - 8px);
    border-radius: 4px;
    display: flex;
    align-items: center;
    cursor: grab;
    opacity: 0.85;
    overflow: hidden;
}

.tl-animation-block:hover {
    opacity: 1;
}

.tl-animation-handle {
    width: 6px;
    height: 100%;
    cursor: ew-resize;
    flex-shrink: 0;
}

.tl-animation-handle-left {
    border-radius: 4px 0 0 4px;
}

.tl-animation-handle-right {
    border-radius: 0 4px 4px 0;
}

.tl-animation-content {
    flex: 1;
    padding: 0 4px;
    overflow: hidden;
}

.tl-animation-label {
    font-size: 10px;
    color: #000;
    font-weight: 500;
    white-space: nowrap;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline/AnimationsTrack.jsx src/components/Timeline/AnimationsTrack.css
git commit -m "feat: add AnimationsTrack with enter/emphasis/exit blocks"
```

---

### Task 6: Integrate Screencast Tracks into Timeline

**Files:**
- Modify: `src/components/Timeline/Timeline.jsx`

- [ ] **Step 1: Read current Timeline.jsx**

Read the file to understand current structure.

- [ ] **Step 2: Add imports**

Add near top:

```js
import { ZoomPanTrack } from './ZoomPanTrack';
import { CursorTrack } from './CursorTrack';
import { AnnotationsTrack } from './AnnotationsTrack';
import { AnimationsTrack } from './AnimationsTrack';
```

- [ ] **Step 3: Add store selectors**

Inside the Timeline component, add:

```js
const zoomPanRegions = useTimelineStore(s => s.zoomPanRegions);
const cursorEvents = useTimelineStore(s => s.cursorEvents);
const annotations = useTimelineStore(s => s.annotations);
const animations = useTimelineStore(s => s.animations);
```

- [ ] **Step 4: Render screencast tracks**

In the timeline body, after the `tl-clips` div and before the MarkerLayer, add:

```jsx
{/* Screencast tracks */}
<div className="tl-screencast-tracks" style={{ width: totalWidth }}>
    {tracks.filter(t => t.type === 'zoom-pan').map(track => (
        <ZoomPanTrack
            key={track.id}
            regions={zoomPanRegions}
            zoom={zoom}
            trackHeight={TRACK_HEIGHT}
            onAddRegion={(region) => useTimelineStore.getState().addZoomPanRegion(region)}
            onUpdateRegion={(id, updates) => useTimelineStore.getState().updateZoomPanRegion(id, updates)}
            onRemoveRegion={(id) => useTimelineStore.getState().removeZoomPanRegion(id)}
        />
    ))}
    {tracks.filter(t => t.type === 'cursor').map(track => (
        <CursorTrack
            key={track.id}
            events={cursorEvents}
            zoom={zoom}
            trackHeight={TRACK_HEIGHT}
            onAddEvent={(event) => useTimelineStore.getState().addCursorEvent(event)}
            onUpdateEvent={(id, updates) => useTimelineStore.getState().updateCursorEvent(id, updates)}
            onRemoveEvent={(id) => useTimelineStore.getState().removeCursorEvent(id)}
        />
    ))}
    {tracks.filter(t => t.type === 'annotations').map(track => (
        <AnnotationsTrack
            key={track.id}
            annotations={annotations}
            zoom={zoom}
            trackHeight={TRACK_HEIGHT}
            onAddAnnotation={(ann) => useTimelineStore.getState().addAnnotation(ann)}
            onUpdateAnnotation={(id, updates) => useTimelineStore.getState().updateAnnotation(id, updates)}
            onRemoveAnnotation={(id) => useTimelineStore.getState().removeAnnotation(id)}
        />
    ))}
    {tracks.filter(t => t.type === 'animations').map(track => (
        <AnimationsTrack
            key={track.id}
            animations={animations}
            zoom={zoom}
            trackHeight={TRACK_HEIGHT}
            onAddAnimation={(anim) => useTimelineStore.getState().addAnimation(anim)}
            onUpdateAnimation={(id, updates) => useTimelineStore.getState().updateAnimation(id, updates)}
            onRemoveAnimation={(id) => useTimelineStore.getState().removeAnimation(id)}
        />
    ))}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Timeline/Timeline.jsx
git commit -m "feat: integrate ZoomPanTrack, CursorTrack, AnnotationsTrack, AnimationsTrack into Timeline"
```

---

### Task 7: Integration Test

- [ ] **Step 1: Start dev server and test**

Run: `npm run dev`

Test:
1. Timeline shows Zoom-n-Pan, Cursor, Annotations, Animations tracks
2. Click on Zoom-n-Pan track → creates zoom region block
3. Drag zoom region edges to resize
4. Double-click zoom region to remove
5. Click on Cursor track → adds cursor click marker
6. Click marker → effect selector popup
7. Click on Annotations track → adds callout block
8. Drag callout to reposition
9. Click on Animations track → adds animation block
10. All Phase 1+2 features still work

- [ ] **Step 2: Run lint**

Run: `npm run lint`

- [ ] **Step 3: Fix and commit**

```bash
git add -A
git commit -m "fix: integration fixes for Phase 3 screencast tracks"
```
