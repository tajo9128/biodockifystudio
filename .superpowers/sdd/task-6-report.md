# Task 6: Update useTimeline.js as Thin Wrapper

## Status: DONE

## Changes Made

### 1. `src/store/timelineStore.js`
- Added `addKeyframe` action — inserts/updates keyframe with undo support
- Added `removeKeyframe` action — removes keyframe by clip/paramKey/time with undo support
- Added `getKeyframedValue` pure function — interpolates keyframe values
- Added `duplicateClip` action — duplicates a clip at offset with undo support
- Added `setClipSpeed` action — adjusts speed and duration with undo support
- Added `seek` action — clamps time to [0, duration]

### 2. `src/hooks/useTimeline.js`
- Replaced entire file (~560 lines) with thin Zustand wrapper (~240 lines)
- Wrapper delegates all state/actions to `useTimelineStore`
- Keeps local video cache (`videoCacheRef`) and RAF playback logic at hook layer
- Preserves full backwards-compatible API: all existing properties and methods

## Verification
- Vite dev server started successfully with no compilation errors
- All external callers (`duplicateClip`, `setClipSpeed`, `seek`) confirmed present in wrapper

## Commits
- `3499e68` — refactor: replace useTimeline with thin Zustand wrapper, add keyframe actions to store
- `1262f14` — fix: add duplicateClip, setClipSpeed, seek to store and wrapper for backwards compat
