# Task 5: Update Timeline.jsx to Use New Components

## Status: DONE

## Changes Made

### Timeline.jsx — Full Rewrite
- Replaced all prop-based state (clips, tracks, currentTime, duration, etc.) with Zustand store selectors via `useTimelineStore(selector)`
- Replaced imperative prop callbacks (onSelectClip, onSeek, onSplit, onDelete, onMove, onResize) with `useTimelineStore.getState()` calls
- Replaced inline playhead rendering (`tl-playhead` div + drag logic) with `<Playhead>` component
- Added `<MarkerLayer>` component for marker visualization and interaction
- Added J/L cut audio bar visualization (`.tl-clip-audio-bar` with striped inner pattern)
- Added magnetic mode toggle button in transport bar
- Removed keyboard shortcut useEffect block (now handled by `useTimelineKeyboard`)
- Retained: drag-move, drag-resize, context menu, speed slider, scroll-zoom, track headers, transport controls

### Timeline.css — Appended Styles
- `.tl-clip-group` — positioned relative for J/L cut audio bar overlay
- `.tl-clip-audio-bar` — green semi-transparent bar for J/L cut audio offset
- `.tl-clip-audio-bar-inner` — striped gradient pattern inside audio bar
- `.tl-transport-active` — highlight for active magnetic mode button

## Commits
- `d810645` — `feat: update Timeline to use Zustand store, Playhead, MarkerLayer, magnetic toggle, J/L cut visual`

## Verification
- Vite dev server started without errors (clean build)

## Concerns
- Play button onClick is a no-op placeholder — wiring requires parent EditMode integration (per spec comment)
