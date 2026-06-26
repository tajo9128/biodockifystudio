# Task 9: Update ClipContextMenu for J/L Cuts

## Status: DONE

## Changes Made

Added J-cut, L-cut, and reset audio timing options to `src/components/Timeline/ClipContextMenu.jsx`.

### Changes:
1. Added Zustand import: `import { useTimelineStore } from '../../store/timelineStore';`
2. Added three new menu items after the Delete button:
   - **J-Cut (Audio Before Video)**: Sets audio offset to start 2s before video (clamped to clip start)
   - **L-Cut (Video Ends Before Audio)**: Sets audio duration to extend 2s beyond video
   - **Reset Audio Timing**: Resets audio offset to 0 and duration to null

## Verification
- Vite dev server started successfully with no errors
- File compiles without issues

## Commit
```
feat: add J-cut, L-cut, and reset audio timing to clip context menu
```
Commit hash: `2617472`

## One-line Test Summary
Vite dev server started successfully - no compilation errors.

## Concerns
None.
