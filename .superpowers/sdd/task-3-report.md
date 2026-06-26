# Task 3: Playhead Component with Snapping

## Status: DONE

## Files Created
- `src/components/Timeline/Playhead.jsx` — Playhead component with snap-to-edges and snap-to-markers
- `src/components/Timeline/Playhead.css` — Playhead styles (triangle head + vertical line)

## Implementation Details
- Extracts playhead into reusable component
- Snaps to clip edges (start/end), markers, timeline start (0), and timeline end (duration)
- `SNAP_THRESHOLD_PX = 3` pixels proximity for snapping
- Drag-to-seek via mouse events with scroll container offset calculation

## Verification
- Vite dev server started successfully (no compile errors)

## Commit
- `28aecf7` — `feat: add Playhead component with snap-to-edges and snap-to-markers`

## Concerns
None.
