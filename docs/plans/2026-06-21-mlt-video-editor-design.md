# MLT-Based Docker Video Editor — Design Document

## Overview

Replace browser-side video editing with a Docker-backed MLT rendering engine. Users upload video files to the server, edit timeline via React UI, and render final output via `melt` (MLT CLI) running inside Docker.

## Goals

- Handle 10GB+ video files without browser memory limits
- Professional multi-track timeline editing (Kdenlive-class via MLT)
- Proxy-based preview for smooth editing on any hardware
- Scalable rendering — melt runs in Docker, can be parallelized
- If laptop is capable, local proxy editing with server-side final render

## Architecture

```
Browser (React)                    Docker Engine
┌───────────────────┐              ┌─────────────────────────────────┐
│  Timeline UI       │  REST/WS    │  project-server.js (Node.js)    │
│  Preview Player    │◄───────────►│  • Project CRUD                 │
│  Upload/Export UI  │             │  • JSON → MLT XML converter     │
└───────────────────┘              │  • Render job queue             │
                                   │  • Proxy generator              │
                                   │  • Thumbnail generator          │
                                   │  • File server (range support)  │
                                   └────────┬────────────────────────┘
                                            │ child_process.exec(melt)
                                   ┌────────┴────────────────────────┐
                                   │  MLT Runtime Container          │
                                   │  • melt CLI                     │
                                   │  • FFmpeg (libavformat)         │
                                   │  • frei0r video plugins         │
                                   │  • LADSPA audio plugins         │
                                   │  • SoX audio processing         │
                                   └─────────────────────────────────┘

Shared Volumes (Docker named volumes or bind mounts):
  /videos/     — source uploads (e.g., /videos/<project_id>/<clip_id>.mp4)
  /proxies/    — 480p preview files (e.g., /proxies/<clip_id>.mp4)
  /projects/   — MLT XML project files + JSON state
  /output/     — rendered exports
```

## Project File Format

Two representations:

| Layer | Format | Purpose |
|-------|--------|---------|
| Frontend state | JSON | React state, lightweight, easy to diff |
| Render input | MLT XML | Native `melt` input format |

Backend contains a `json-to-mlt` converter module that transforms JSON timeline state into valid MLT XML. This is invoked at render time.

**MLT XML structure (generated)**:
```xml
<mlt>
  <profile description="HD 1080p" width="1920" height="1080" .../>
  <producer id="clip1" resource="/videos/proj1/clip1.mp4"/>
  <producer id="clip2" resource="/videos/proj1/clip2.mp4"/>
  <playlist id="track1">
    <entry producer="clip1" in="0" out="300"/>
    <entry producer="clip2" in="50" out="200"/>
  </playlist>
  <playlist id="track2">
    <entry producer="clip1" in="0" out="300" filter="frei0r.composite"/>
  </playlist>
  <tractor>
    <track producer="track1"/>
    <track producer="track2"/>
    <transition>composite</transition>
  </tractor>
</mlt>
```

## API Endpoints

### Projects
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project (JSON) |
| PUT | `/api/projects/:id/timeline` | Save timeline state |
| DELETE | `/api/projects/:id` | Delete project |

### Upload
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload video file (multipart) → stores in /videos, generates proxy |
| GET | `/api/videos/:id` | Serve proxy for preview (HTTP range) |
| GET | `/api/videos/:id/source` | Serve source file |
| POST | `/api/videos/:id/proxy` | Regenerate proxy |

### Render
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/:id/render` | Queue render job (body: { format, resolution, preset }) |
| GET | `/api/projects/:id/jobs` | List jobs for project |
| GET | `/api/jobs/:jobId` | Job status/progress |
| DELETE | `/api/jobs/:jobId` | Cancel job |
| GET | `/api/jobs/:jobId/output` | Download rendered file |

### Timeline Operations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/:id/thumbnail` | Generate thumbnail at timecode |
| POST | `/api/projects/:id/export-mlt` | Export current timeline as MLT XML (download) |

## Upload & Proxy Pipeline

```
User drags file → POST /api/upload
  ├── File saved to /videos/<project>/<clip_id>.<ext>
  ├── FFmpeg spawn:
  │     ffmpeg -i <source> -vf scale=854:480 -c:v libx264 -crf 28 -an
  │            -movflags +faststart /proxies/<clip_id>.mp4
  └── Response: { clipId, proxyUrl, sourceUrl, duration, ... }

Frontend:
  - Plays proxy via <video> with src=<proxyUrl>
  - HTTP range requests for seeking (no full download)
  - Timeline edits update local JSON state only
```

## Render Job System

```
User clicks "Render" → POST /api/projects/:id/render
  ├── Backend validates timeline
  ├── JSON → MLT XML converter produces /projects/<proj>.mlt
  ├── Store job in queue with status="queued"
  ├── Worker picks up job:
  │     melt /projects/<proj>.mlt
  │       -consumer avformat:/output/<proj>.mp4
  │       properties=crf=23,preset=medium,width=1920,height=1080
  ├── Parse melt stderr for frame count → calculate %
  ├── Frontend polls GET /api/jobs/:jobId → { status, progress, eta }
  └── On complete: { status: "done", outputUrl: "/api/jobs/:jobId/output" }
```

## Preview Model

- **Playback**: Frontend plays proxy MP4 via standard `<video>` element. Proxy files are small (480p, CRF 28, no audio), so browser can handle them even on modest hardware.
- **Seek/Scrub**: `<video>` element seeks within proxy. For precise frame-accurate thumbnails, backend provides `/api/projects/:id/thumbnail?time=XX` which runs `melt -consumer avformat:- -vframes 1` and returns a JPEG.
- **Audio**: Backend generates a separate 128k AAC audio proxy for preview. Frontend uses Web Audio API for synchronized playback while editing.

## MLT Docker Image

Base: `alpine:3.20` (smallest footprint)

Libraries to build/install:
- **MLT** 7.38+ — core framework + melt CLI
- **FFmpeg** 7.x — codec support (libx264, libx265, aac, mp3)
- **frei0r-plugins** — video effects (gamma, saturation, composite, etc.)
- **LADSPA** — audio effects
- **SoX** — audio processing
- **Node.js** 22 — API server

Build approach:
- Multi-stage build: Stage 1 compiles MLT + FFmpeg, Stage 2 copies binaries to minimal runtime
- Alpine packages: `melt`, `ffmpeg`, `frei0r-plugins` available via community repos (if not, compile from source)

## Frontend Components

### New Components
| Component | Purpose |
|-----------|---------|
| `ProjectManager` | List/create/open projects |
| `UploadZone` | Drag-drop upload with progress |
| `RenderDialog` | Export settings, job progress |
| `ClipProperties` | Duration, trim in/out, speed |

### Modified Components
| Component | Change |
|-----------|--------|
| `EditMode` | Add project context, timeline save, render button |
| Timeline (`useTimeline.js`) | Add clip sourcing from server URLs, debounced save to backend |
| Preview player | Load from proxy URL instead of blob URL |

## Docker Compose Integration

```yaml
# docker-compose.full.yml addition:
services:
  project-server:
    build:
      context: ./server
      dockerfile: Dockerfile.project
    ports:
      - "8082:8082"
    volumes:
      - videos:/videos
      - proxies:/proxies
      - projects:/projects
      - output:/output
    depends_on:
      - recording-server

volumes:
  videos:
  proxies:
  projects:
  output:
```

Nginx routes:
```nginx
location /api/projects/  { proxy_pass http://project-server:8082; }
location /api/upload     { proxy_pass http://project-server:8082; }
location /api/jobs/      { proxy_pass http://project-server:8082; }
```

## Implementation Phases

### Phase 1: MLT Docker Image + Project API
- Build Docker image with MLT, melt, FFmpeg, Node.js
- Create `server/project-server.js` with project CRUD + upload
- Implement JSON-to-MLT XML converter
- Test: upload file, create project, render via API

### Phase 2: Timeline Integration
- Extend frontend to load/save timeline from server
- Show proxy clips in timeline
- Basic trim/cut operations that persist to server

### Phase 3: Render UI
- RenderDialog component (presets, progress bar)
- Job queue management
- Download rendered output

### Phase 4: Polish + Scaling
- Multi-track compositing
- Effects support (frei0r)
- Parallel render workers
- Cleanup old proxies/jobs

## Constraints

- No GPU — all encoding via software (libx264)
- 480p proxy preview (854x480, CRF 28)
- Docker Desktop on Windows
- Open-source stack only (MLT, FFmpeg, frei0r, Node.js)

## Open Questions

- What MLT preset profiles to offer for render output?
- How to handle audio mixing across multiple tracks?
- Should proxy generation happen synchronously with upload or asynchronously (job)?
