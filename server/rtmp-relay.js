// RTMP Relay Server — WebSocket → FFmpeg → RTMP
// Receives WebM chunks from browser, pipes to FFmpeg which outputs to RTMP ingest
const WebSocket = require('ws');
const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: 'ok', activeStreams: wss.clients.size }));
        return;
    }
    res.writeHead(404);
    res.end();
});

const ALLOWED_RTMP_HOSTS = [
    'a.rtmp.youtube.com',
    'b.rtmp.youtube.com',
    'contribute.live-video.net', // Twitch
    'live.twitch.tv',
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function isValidRtmpUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'rtmp:' && ALLOWED_RTMP_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
    } catch {
        return false;
    }
}

function log(level, ...args) {
    const ts = new Date().toISOString();
    console[level](`[${ts}]`, ...args);
}

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    log('info', 'Client connected');
    let ffmpeg = null;
    let config = null;
    let retryCount = 0;
    let pendingChunks = [];

    function spawnFfmpeg(cfg) {
        const [w, h] = (cfg.resolution || '1080p') === '1440p' ? [2560, 1440] :
                       (cfg.resolution || '1080p') === '720p' ? [1280, 720] : [1920, 1080];

        const proc = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-b:v', `${cfg.bitrate || 6000000}`,
            '-maxrate', `${cfg.bitrate || 6000000}`,
            '-bufsize', `${(cfg.bitrate || 6000000) * 2}`,
            '-g', '60',
            '-r', `${cfg.framerate || 30}`,
            '-s', `${w}x${h}`,
            '-c:a', 'aac',
            '-b:a', `${cfg.audioBitrate || 128000}`,
            '-ar', '44100',
            '-f', 'flv',
            cfg.rtmpUrl,
        ]);

        proc.stdin.on('error', (err) => {
            log('error', 'FFmpeg stdin error:', err.message);
        });

        proc.stderr.on('data', (chunk) => {
            const msg = chunk.toString();
            if (msg.includes('error') || msg.includes('Error') || msg.includes('fail')) {
                log('error', 'FFmpeg:', msg.trim());
            }
        });

        proc.on('close', (code) => {
            log('info', `FFmpeg exited with code ${code}`);
            if (code !== 0 && code !== null && retryCount < MAX_RETRIES) {
                retryCount++;
                log('info', `Retrying FFmpeg (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
                ws.send(JSON.stringify({ type: 'reconnecting', attempt: retryCount, max: MAX_RETRIES }));
                setTimeout(() => {
                    ffmpeg = spawnFfmpeg(cfg);
                    // Flush pending chunks
                    for (const chunk of pendingChunks) {
                        if (ffmpeg.stdin.writable) ffmpeg.stdin.write(chunk);
                    }
                    pendingChunks = [];
                }, RETRY_DELAY_MS);
            } else if (code !== 0 && code !== null) {
                log('error', 'FFmpeg failed after max retries');
                ws.send(JSON.stringify({ type: 'error', error: `FFmpeg exited with code ${code} after ${MAX_RETRIES} retries` }));
                ws.close();
            } else {
                ws.close();
            }
        });

        return proc;
    }

    ws.on('message', (data) => {
        // First message is config JSON
        if (!config && typeof data === 'string') {
            try {
                config = JSON.parse(data);
                if (config.type === 'config') {
                    // Validate RTMP URL
                    if (!config.rtmpUrl) {
                        ws.send(JSON.stringify({ type: 'error', error: 'Missing RTMP URL' }));
                        return;
                    }
                    if (!isValidRtmpUrl(config.rtmpUrl)) {
                        ws.send(JSON.stringify({ type: 'error', error: 'RTMP URL not in allowlist. Add your host to ALLOWED_RTMP_HOSTS in server/rtmp-relay.js' }));
                        return;
                    }

                    log('info', 'Stream config:', config.rtmpUrl?.split('/').pop() ? '(key set)' : '(no key)');
                    log('info', `Resolution: ${config.resolution}, Bitrate: ${config.bitrate}`);

                    ffmpeg = spawnFfmpeg(config);
                    ws.send(JSON.stringify({ type: 'started' }));
                    return;
                }
            } catch (err) {
                log('error', 'Config parse error:', err.message);
                ws.send(JSON.stringify({ type: 'error', error: 'Invalid config JSON' }));
                return;
            }
        }

        // Stop command
        if (typeof data === 'string') {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'stop') {
                    if (ffmpeg) {
                        ffmpeg.stdin.end();
                        ffmpeg.kill('SIGTERM');
                    }
                    ws.close();
                    return;
                }
            } catch {}
        }

        // Binary data → pipe to FFmpeg
        if (Buffer.isBuffer(data)) {
            if (ffmpeg && ffmpeg.stdin.writable) {
                ffmpeg.stdin.write(data);
            } else {
                // Buffer chunks while FFmpeg is restarting
                pendingChunks.push(data);
                if (pendingChunks.length > 500) pendingChunks.shift(); // cap at ~5s of data
            }
        }
    });

    ws.on('close', () => {
        log('info', 'Client disconnected');
        retryCount = MAX_RETRIES; // prevent retries after client leaves
        pendingChunks = [];
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill('SIGTERM');
        }
    });

    ws.on('error', (err) => {
        log('error', 'WebSocket error:', err.message);
    });
});

server.listen(PORT, () => {
    console.log(`RTMP Relay Server running on port ${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
});
