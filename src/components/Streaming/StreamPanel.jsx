import React, { useState } from 'react';
import './StreamPanel.css';

const PLATFORMS = [
    { id: 'youtube', label: 'YouTube', icon: 'YT', color: '#ff0000', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2' },
    { id: 'twitch', label: 'Twitch', icon: 'TW', color: '#9146ff', rtmpUrl: 'rtmp://live.twitch.tv/app' },
    { id: 'custom', label: 'Custom RTMP', icon: 'RT', color: '#6b7280', rtmpUrl: '' },
];

function formatUptime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes) {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export const StreamPanel = ({
    isOpen, onClose,
    isStreaming, isConnecting, streamError, streamStats,
    destinations, destStatuses,
    addDestination, removeDestination, updateDestination, setPlatform,
    relayUrl, setRelayUrl,
    resolution, setResolution,
    bitrate, setBitrate,
    onStartStream, onStopStream, onCheckRelay,
    canvasRef, audioStream,
}) => {
    const [relayStatus, setRelayStatus] = useState(null);

    if (!isOpen) return null;

    const handleCheckRelay = async () => {
        const ok = await onCheckRelay();
        setRelayStatus(ok ? 'connected' : 'disconnected');
    };

    const canGoLive = destinations?.filter(d => d.streamKey && d.rtmpUrl).length > 0;

    return (
        <div className="stream-modal-overlay" onClick={onClose}>
            <div className="stream-modal" onClick={e => e.stopPropagation()}>
                <div className="stream-modal-header">
                    <h2>Stream Settings</h2>
                    <button className="btn-icon-bg" onClick={onClose}>x</button>
                </div>

                <div className="stream-modal-body">
                    {/* Destinations */}
                    <div className="stream-modal-section">
                        <div className="stream-modal-label">Destinations ({destinations?.length || 0})</div>
                        {destinations?.map((dest, i) => {
                            const pInfo = PLATFORMS.find(p => p.id === dest.platform) || PLATFORMS[2];
                            const status = destStatuses?.[dest.platform];
                            return (
                                <div key={i} className="stream-dest-row">
                                    <div className="stream-dest-row-top">
                                        <span className="stream-dest-badge" style={{ background: pInfo.color }}>{pInfo.icon}</span>
                                        <select
                                            className="stream-input"
                                            value={dest.platform}
                                            onChange={e => setPlatform(i, e.target.value)}
                                        >
                                            {PLATFORMS.map(p => (
                                                <option key={p.id} value={p.id}>{p.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="stream-input stream-key-input"
                                            value={dest.streamKey}
                                            onChange={e => updateDestination(i, { streamKey: e.target.value })}
                                            placeholder="Stream key"
                                            type="password"
                                        />
                                        {destinations.length > 1 && (
                                            <button className="stream-dest-remove" onClick={() => removeDestination(i)}>x</button>
                                        )}
                                    </div>
                                    {dest.platform === 'custom' && (
                                        <input
                                            className="stream-input"
                                            value={dest.rtmpUrl}
                                            onChange={e => updateDestination(i, { rtmpUrl: e.target.value })}
                                            placeholder="rtmp://..."
                                        />
                                    )}
                                    {status && (
                                        <div className={`stream-dest-status ${status.status}`}>
                                            {status.status === 'connected' ? 'Live' :
                                             status.status === 'reconnecting' ? `Retry ${status.attempt}` :
                                             status.status === 'failed' ? 'Failed' : status.status}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <button className="stream-add-dest" onClick={() => addDestination()}>+ Add Destination</button>
                    </div>

                    {/* Relay */}
                    <div className="stream-modal-section">
                        <div className="stream-modal-label">Relay Server</div>
                        <div className="stream-modal-row">
                            <input className="stream-input" value={relayUrl}
                                onChange={e => setRelayUrl(e.target.value)}
                                placeholder="ws://localhost:8080" />
                            <button className="btn btn-outline" onClick={handleCheckRelay}>Check</button>
                        </div>
                        {relayStatus && (
                            <div className={`stream-relay-status ${relayStatus}`}>
                                Relay: {relayStatus === 'connected' ? 'Connected' : 'Not reachable'}
                            </div>
                        )}
                    </div>

                    {/* Quality */}
                    <div className="stream-modal-section">
                        <div className="stream-modal-label">Quality</div>
                        <div className="stream-modal-row">
                            <select className="stream-input" value={resolution} onChange={e => setResolution(e.target.value)}>
                                <option value="720p">720p (HD)</option>
                                <option value="1080p">1080p (FHD)</option>
                                <option value="1440p">1440p (2K)</option>
                            </select>
                            <select className="stream-input" value={bitrate} onChange={e => setBitrate(Number(e.target.value))}>
                                <option value="2500">2.5 Mbps</option>
                                <option value="4000">4 Mbps</option>
                                <option value="6000">6 Mbps</option>
                                <option value="8000">8 Mbps</option>
                                <option value="12000">12 Mbps</option>
                            </select>
                        </div>
                    </div>

                    {/* Stats */}
                    {isStreaming && (
                        <div className="stream-modal-section">
                            <div className="stream-modal-label">Stream Stats</div>
                            <div className="stream-stats-grid">
                                <div className="stream-stat-card">
                                    <span className="stream-stat-value">{formatUptime(streamStats?.uptime)}</span>
                                    <span className="stream-stat-label">Uptime</span>
                                </div>
                                <div className="stream-stat-card">
                                    <span className="stream-stat-value">{streamStats?.bitrate || 0} kbps</span>
                                    <span className="stream-stat-label">Bitrate</span>
                                </div>
                                <div className="stream-stat-card">
                                    <span className="stream-stat-value">{resolution}</span>
                                    <span className="stream-stat-label">Quality</span>
                                </div>
                                <div className="stream-stat-card">
                                    <span className="stream-stat-value">{formatBytes(streamStats?.bytesSent)}</span>
                                    <span className="stream-stat-label">Sent</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {streamError && (
                        <div className="stream-error">{streamError}</div>
                    )}
                </div>

                <div className="stream-modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Close</button>
                    {!isStreaming ? (
                        <button className="btn btn-primary" onClick={() => onStartStream(canvasRef.current, audioStream)}
                            disabled={!canGoLive || isConnecting}>
                            {isConnecting ? 'Connecting...' : 'Go Live'}
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={onStopStream}>End Stream</button>
                    )}
                </div>
            </div>
        </div>
    );
};
