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

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    let ffmpeg = null;
    let config = null;

    ws.on('message', (data) => {
        // First message is config JSON
        if (!config && typeof data === 'string') {
            try {
                config = JSON.parse(data);
                if (config.type === 'config') {
                    console.log('Stream config:', config.rtmpUrl?.split('/').pop() ? '(key set)' : '(no key)');
                    console.log(`Resolution: ${config.resolution}, Bitrate: ${config.bitrate}`);

                    // Launch FFmpeg
                    const [w, h] = (config.resolution || '1080p') === '1440p' ? [2560, 1440] :
                                   (config.resolution || '1080p') === '720p' ? [1280, 720] : [1920, 1080];

                    ffmpeg = spawn('ffmpeg', [
                        '-i', 'pipe:0',
                        '-c:v', 'libx264',
                        '-preset', 'veryfast',
                        '-b:v', `${config.bitrate || 6000000}`,
                        '-maxrate', `${config.bitrate || 6000000}`,
                        '-bufsize', `${(config.bitrate || 6000000) * 2}`,
                        '-g', '60',
                        '-r', `${config.framerate || 30}`,
                        '-s', `${w}x${h}`,
                        '-c:a', 'aac',
                        '-b:a', `${config.audioBitrate || 128000}`,
                        '-ar', '44100',
                        '-f', 'flv',
                        config.rtmpUrl,
                    ]);

                    ffmpeg.stdin.on('error', (err) => {
                        console.error('FFmpeg stdin error:', err.message);
                    });

                    ffmpeg.stderr.on('data', (chunk) => {
                        const msg = chunk.toString();
                        if (msg.includes('error') || msg.includes('Error')) {
                            console.error('FFmpeg:', msg.trim());
                        }
                    });

                    ffmpeg.on('close', (code) => {
                        console.log(`FFmpeg exited with code ${code}`);
                        ws.close();
                    });

                    ws.send(JSON.stringify({ type: 'started' }));
                    return;
                }
            } catch (err) {
                console.error('Config parse error:', err.message);
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid config' }));
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
        if (ffmpeg && ffmpeg.stdin.writable && Buffer.isBuffer(data)) {
            ffmpeg.stdin.write(data);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill('SIGTERM');
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
    });
});

server.listen(PORT, () => {
    console.log(`RTMP Relay Server running on port ${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
});
