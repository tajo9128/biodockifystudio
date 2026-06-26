# Phase 4: Transitions Library & Drag-Drop Effects

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a transitions library panel, between-clip transition zones, clip-level effect drag-drop, and fx badges.

**Architecture:** TransitionLibrary panel with draggable items. TransitionHandles render between adjacent clips on timeline. EffectBadge shows on clips with effects. All drag-drop uses HTML5 drag API.

**Tech Stack:** React 19, Zustand, HTML5 Drag and Drop API

## Global Constraints
- Browser-based React SPA, no server changes
- Must preserve all Phase 1-3 features
- No new npm dependencies

---

### Task 1: Transition Library Panel

**Files:**
- Create: `src/components/Transitions/TransitionLibrary.jsx`
- Create: `src/components/Transitions/TransitionLibrary.css`

- [ ] **Step 1: Create TransitionLibrary.jsx**

A sidebar panel showing available transitions and effects as draggable items.

```jsx
import React, { useState } from 'react';
import './TransitionLibrary.css';

const TRANSITIONS = [
    { id: 'cross-dissolve', name: 'Cross Dissolve', type: 'transition', icon: 'X' },
    { id: 'fade-to-black', name: 'Fade to Black', type: 'transition', icon: 'B' },
    { id: 'wipe-left', name: 'Wipe Left', type: 'transition', icon: 'L' },
    { id: 'wipe-right', name: 'Wipe Right', type: 'transition', icon: 'R' },
    { id: 'slide-left', name: 'Slide Left', type: 'transition', icon: 'S' },
    { id: 'zoom-in', name: 'Zoom In', type: 'transition', icon: 'Z' },
];

const EFFECTS = [
    { id: 'drop-shadow', name: 'Drop Shadow', type: 'effect', icon: 'D' },
    { id: 'glow', name: 'Glow', type: 'effect', icon: 'G' },
    { id: 'blur', name: 'Blur', type: 'effect', icon: 'B' },
    { id: 'sharpen', name: 'Sharpen', type: 'effect', icon: 'S' },
    { id: 'vignette', name: 'Vignette', type: 'effect', icon: 'V' },
    { id: 'color-grade', name: 'Color Grade', type: 'effect', icon: 'C' },
];

const CALLOUTS = [
    { id: 'text-box', name: 'Text Box', type: 'callout', icon: 'T' },
    { id: 'arrow', name: 'Arrow', type: 'callout', icon: 'A' },
    { id: 'blur-box', name: 'Blur Box', type: 'callout', icon: 'B' },
    { id: 'highlight', name: 'Highlight', type: 'callout', icon: 'H' },
];

export const TransitionLibrary = () => {
    const [activeTab, setActiveTab] = useState('transitions');
    const [searchQuery, setSearchQuery] = useState('');

    const items = activeTab === 'transitions' ? TRANSITIONS
        : activeTab === 'effects' ? EFFECTS
        : CALLOUTS;

    const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDragStart = (e, item) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="tl-library">
            <div className="tl-library-header">
                <h3>Library</h3>
            </div>

            <div className="tl-library-tabs">
                <button className={`tl-lib-tab ${activeTab === 'transitions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transitions')}>Transitions</button>
                <button className={`tl-lib-tab ${activeTab === 'effects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('effects')}>Effects</button>
                <button className={`tl-lib-tab ${activeTab === 'callouts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('callouts')}>Callouts</button>
            </div>

            <input
                className="tl-library-search"
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="tl-library-items">
                {filtered.map(item => (
                    <div
                        key={item.id}
                        className={`tl-lib-item tl-lib-item-${item.type}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                    >
                        <div className="tl-lib-item-icon">{item.icon}</div>
                        <span className="tl-lib-item-name">{item.name}</span>
                    </div>
                ))}
            </div>

            <div className="tl-library-hint">
                Drag to timeline to apply
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Create TransitionLibrary.css**

```css
.tl-library {
    width: 200px;
    background: var(--bg-secondary, #1e1e2e);
    border-left: 1px solid var(--border, #333);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.tl-library-header {
    padding: 12px;
    border-bottom: 1px solid var(--border, #333);
}

.tl-library-header h3 {
    margin: 0;
    font-size: 14px;
    color: var(--text-primary, #fff);
}

.tl-library-tabs {
    display: flex;
    border-bottom: 1px solid var(--border, #333);
}

.tl-lib-tab {
    flex: 1;
    padding: 8px 4px;
    border: none;
    background: none;
    color: var(--text-secondary, #aaa);
    font-size: 11px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
}

.tl-lib-tab.active {
    color: var(--primary, #8b5cf6);
    border-bottom-color: var(--primary, #8b5cf6);
}

.tl-library-search {
    margin: 8px;
    padding: 6px 8px;
    border: 1px solid var(--border, #333);
    border-radius: 4px;
    background: var(--bg-primary, #12121a);
    color: var(--text-primary, #fff);
    font-size: 12px;
    outline: none;
}

.tl-library-search:focus {
    border-color: var(--primary, #8b5cf6);
}

.tl-library-items {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
}

.tl-lib-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    cursor: grab;
    transition: background 0.15s;
}

.tl-lib-item:hover {
    background: var(--bg-tertiary, #2a2a3a);
}

.tl-lib-item:active {
    cursor: grabbing;
}

.tl-lib-item-icon {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: #fff;
    flex-shrink: 0;
}

.tl-lib-item-transition .tl-lib-item-icon {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
}

.tl-lib-item-effect .tl-lib-item-icon {
    background: linear-gradient(135deg, #10b981, #3b82f6);
}

.tl-lib-item-callout .tl-lib-item-icon {
    background: linear-gradient(135deg, #f59e0b, #ef4444);
}

.tl-lib-item-name {
    font-size: 12px;
    color: var(--text-primary, #fff);
}

.tl-library-hint {
    padding: 8px;
    text-align: center;
    font-size: 10px;
    color: var(--text-secondary, #aaa);
    border-top: 1px solid var(--border, #333);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Transitions/TransitionLibrary.jsx src/components/Transitions/TransitionLibrary.css
git commit -m "feat: add TransitionLibrary panel with draggable transitions, effects, and callouts"
```

---

### Task 2: TransitionHandles Component

**Files:**
- Create: `src/components/Timeline/TransitionHandles.jsx`
- Create: `src/components/Timeline/TransitionHandles.css`

- [ ] **Step 1: Create TransitionHandles.jsx**

Renders transition zones between adjacent clips on the same track.

```jsx
import React, { useState, useCallback } from 'react';
import './TransitionHandles.css';

const TIME_SCALE_BASE = 80;
const TRANSITION_DURATION = 1.0; // seconds

export const TransitionHandles = ({
    clips,
    tracks,
    zoom,
    trackHeight,
    onApplyTransition,
    onRemoveTransition,
}) => {
    const [hoveredGap, setHoveredGap] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const timeScale = TIME_SCALE_BASE * zoom;

    const timeToX = useCallback((t) => t * timeScale, [timeScale]);

    // Find adjacent clip pairs
    const findAdjacentPairs = useCallback(() => {
        const pairs = [];
        const trackClips = {};

        clips.forEach(clip => {
            if (!trackClips[clip.trackIndex]) trackClips[clip.trackIndex] = [];
            trackClips[clip.trackIndex].push(clip);
        });

        for (const [, tc] of Object.entries(trackClips)) {
            tc.sort((a, b) => a.startTime - b.startTime);
            for (let i = 0; i < tc.length - 1; i++) {
                const clipA = tc[i];
                const clipB = tc[i + 1];
                const gap = clipB.startTime - (clipA.startTime + clipA.duration);

                // Adjacent or small gap (within transition range)
                if (Math.abs(gap) < TRANSITION_DURATION * 2) {
                    pairs.push({
                        id: `${clipA.id}-${clipB.id}`,
                        clipA,
                        clipB,
                        gap,
                        midpoint: clipA.startTime + clipA.duration + gap / 2,
                    });
                }
            }
        }
        return pairs;
    }, [clips]);

    const pairs = findAdjacentPairs();

    const handleDragOver = (e, pair) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(pair.id);
    };

    const handleDragLeave = () => {
        setDragOver(null);
    };

    const handleDrop = (e, pair) => {
        e.preventDefault();
        setDragOver(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'transition') {
                onApplyTransition?.(pair.clipA.id, pair.clipB.id, data.id);
            }
        } catch {}
    };

    return (
        <div className="tl-transition-handles">
            {pairs.map(pair => {
                const x = timeToX(pair.midpoint);
                const hasTransition = pair.clipA.transitions?.out || pair.clipB.transitions?.in;

                return (
                    <div
                        key={pair.id}
                        className={`tl-transition-zone ${dragOver === pair.id ? 'tl-transition-dragover' : ''} ${hasTransition ? 'tl-transition-active' : ''}`}
                        style={{ left: x - 12, width: 24, top: pair.clipA.trackIndex * trackHeight }}
                        onMouseEnter={() => setHoveredGap(pair.id)}
                        onMouseLeave={() => setHoveredGap(null)}
                        onDragOver={(e) => handleDragOver(e, pair)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, pair)}
                        onClick={() => {
                            if (hasTransition) {
                                onRemoveTransition?.(pair.clipA.id);
                            }
                        }}
                    >
                        <div className="tl-transition-icon">
                            {hasTransition ? '◆' : '◇'}
                        </div>

                        {hoveredGap === pair.id && !hasTransition && (
                            <div className="tl-transition-tooltip">
                                Drop transition here
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
```

- [ ] **Step 2: Create TransitionHandles.css**

```css
.tl-transition-handles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 20;
}

.tl-transition-zone {
    position: absolute;
    height: 48px;
    pointer-events: auto;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.15s;
}

.tl-transition-zone:hover {
    background: rgba(139, 92, 246, 0.2);
}

.tl-transition-dragover {
    background: rgba(139, 92, 246, 0.4) !important;
    border: 1px dashed var(--primary, #8b5cf6);
}

.tl-transition-active {
    background: rgba(139, 92, 246, 0.15);
}

.tl-transition-icon {
    font-size: 14px;
    color: var(--primary, #8b5cf6);
    opacity: 0.6;
}

.tl-transition-active .tl-transition-icon {
    opacity: 1;
}

.tl-transition-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-secondary, #1e1e2e);
    border: 1px solid var(--border, #333);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 10px;
    color: var(--text-primary, #fff);
    white-space: nowrap;
    pointer-events: none;
    z-index: 30;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline/TransitionHandles.jsx src/components/Timeline/TransitionHandles.css
git commit -m "feat: add TransitionHandles with drop zones between adjacent clips"
```

---

### Task 3: EffectBadge Component

**Files:**
- Create: `src/components/Timeline/EffectBadge.jsx`
- Create: `src/components/Timeline/EffectBadge.css`

- [ ] **Step 1: Create EffectBadge.jsx**

Small badge shown on clips that have effects applied.

```jsx
import React from 'react';
import './EffectBadge.css';

export const EffectBadge = ({ effects = [], onClick }) => {
    if (!effects || effects.length === 0) return null;

    return (
        <div className="tl-effect-badge" onClick={onClick} title={`${effects.length} effect(s)`}>
            <span className="tl-effect-badge-fx">fx</span>
            {effects.length > 1 && (
                <span className="tl-effect-badge-count">{effects.length}</span>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Create EffectBadge.css**

```css
.tl-effect-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    display: flex;
    align-items: center;
    gap: 2px;
    pointer-events: auto;
    cursor: pointer;
    z-index: 6;
}

.tl-effect-badge-fx {
    background: var(--primary, #8b5cf6);
    color: #fff;
    font-size: 8px;
    font-weight: bold;
    padding: 1px 3px;
    border-radius: 2px;
    line-height: 1;
}

.tl-effect-badge-count {
    background: var(--bg-secondary, #1e1e2e);
    color: var(--text-secondary, #aaa);
    font-size: 8px;
    padding: 1px 3px;
    border-radius: 2px;
    line-height: 1;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline/EffectBadge.jsx src/components/Timeline/EffectBadge.css
git commit -m "feat: add EffectBadge for clips with applied effects"
```

---

### Task 4: Integrate into Timeline.jsx

**Files:**
- Modify: `src/components/Timeline/Timeline.jsx`

- [ ] **Step 1: Read Timeline.jsx**

Read the current file.

- [ ] **Step 2: Add imports**

```js
import { TransitionHandles } from './TransitionHandles';
import { EffectBadge } from './EffectBadge';
```

- [ ] **Step 3: Render TransitionHandles**

After the clips rendering and before the MarkerLayer, add:

```jsx
<TransitionHandles
    clips={clips}
    tracks={tracks}
    zoom={zoom}
    trackHeight={TRACK_HEIGHT}
    onApplyTransition={(clipAId, clipBId, transitionId) => {
        const store = useTimelineStore.getState();
        store.updateClip(clipAId, { transitions: { ...store.clips.find(c => c.id === clipAId)?.transitions, out: transitionId } });
        store.updateClip(clipBId, { transitions: { ...store.clips.find(c => c.id === clipBId)?.transitions, in: transitionId } });
    }}
    onRemoveTransition={(clipAId) => {
        const store = useTimelineStore.getState();
        store.updateClip(clipAId, { transitions: { ...store.clips.find(c => c.id === clipAId)?.transitions, out: null } });
    }}
/>
```

- [ ] **Step 4: Add EffectBadge to clip rendering**

In the `renderClip` function, inside the clip div, add EffectBadge after the keyframes:

```jsx
<EffectBadge effects={clip.filters} />
```

- [ ] **Step 5: Add drag-drop handler for effects**

In the `tl-scroll` onDrop handler, add handling for effects:

```js
try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data.type === 'effect') {
        // Find which clip was dropped on
        const rect = scrollRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
        const y = e.clientY - rect.top;
        const trackIndex = Math.floor(y / TRACK_HEIGHT);
        const time = xToTime(x);
        const targetClip = clips.find(c => c.trackIndex === trackIndex && time >= c.startTime && time < c.startTime + c.duration);
        if (targetClip) {
            useTimelineStore.getState().updateClip(targetClip.id, {
                filters: [...(targetClip.filters || []), { filterId: data.id, params: {} }]
            });
        }
    }
} catch {}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Timeline/Timeline.jsx
git commit -m "feat: integrate TransitionHandles and EffectBadge into Timeline, add effect drop handling"
```

---

### Task 5: Add TransitionLibrary to EditMode

**Files:**
- Modify: `src/components/EditMode/EditMode.jsx`

- [ ] **Step 1: Read EditMode.jsx**

- [ ] **Step 2: Add import**

```js
import { TransitionLibrary } from '../Transitions/TransitionLibrary';
```

- [ ] **Step 3: Render TransitionLibrary**

Add the TransitionLibrary panel in the EditMode layout, next to the RightPanel or as a sidebar.

- [ ] **Step 4: Commit**

```bash
git add src/components/EditMode/EditMode.jsx
git commit -m "feat: add TransitionLibrary panel to EditMode layout"
```

---

### Task 6: Integration Test

- [ ] **Step 1: Start dev server and test**

Run: `npm run dev`

Test:
1. See TransitionLibrary panel in editor
2. Drag "Cross Dissolve" from library to timeline
3. Drop between two adjacent clips → transition icon appears
4. Click transition icon → removes transition
5. See fx badge on clips with effects
6. Drag "Drop Shadow" effect onto a clip → fx badge appears
7. All Phase 1-3 features still work

- [ ] **Step 2: Run lint**

- [ ] **Step 3: Fix and commit**
