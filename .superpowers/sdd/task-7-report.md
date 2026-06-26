# Task 7: Update EditMode to Use Keyboard Shortcuts & Zustand

## Status: DONE

## Changes Made

### EditMode.jsx
1. **Replaced `useKeyboardShortcuts` import** with `useTimelineKeyboard` and `useTimelineStore`
2. **Removed old keyboard shortcuts block** (lines 604-615) that used `useKeyboardShortcuts` with a map of key combos
3. **Added `useTimelineKeyboard` hook call** that wires play/pause/isPlaying from `useTimeline`
4. **Removed `isPlaying`, `onPlay`, `onPause` props** from `<Timeline>` JSX (Timeline reads from Zustand directly)
5. **Added `onPlayPause` prop** to `<Timeline>` for the transport bar play button

### Timeline.jsx
1. **Added `onPlayPause` prop** to component signature
2. **Wired play button onClick** to call `onPlayPause?.()` (was previously empty/no-op)

## Why `onPlayPause` prop was needed

The Timeline's play button had an empty onClick handler. The `useTimeline` hook creates its own `playRafRef` animation loop per instance. Having both EditMode and Timeline call `useTimeline()` would create two separate animation loops that could conflict. Instead, Timeline accepts an `onPlayPause` callback prop that EditMode passes, which calls the play/pause functions from EditMode's single `useTimeline` instance.

## Build Verification
- `vite build --mode development` completed successfully (1.45s, 147 modules transformed)

## Commit
- `4040804` - feat: wire keyboard shortcuts and Zustand store into EditMode
