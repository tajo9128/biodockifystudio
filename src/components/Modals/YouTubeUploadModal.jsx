import React, { useState, useCallback } from 'react';
import { useYouTube } from '../../hooks/useYouTube';
import './YouTubeUploadModal.css';

const CATEGORIES = [
    { id: '22', name: 'People & Blogs' },
    { id: '28', name: 'Science & Technology' },
    { id: '27', name: 'Education' },
    { id: '24', name: 'Entertainment' },
    { id: '20', name: 'Gaming' },
    { id: '10', name: 'Music' },
    { id: '26', name: 'Howto & Style' },
];

const PRIVACY_OPTIONS = [
    { value: 'public', label: 'Public' },
    { value: 'unlisted', label: 'Unlisted' },
    { value: 'private', label: 'Private' },
];

export const YouTubeUploadModal = ({ isOpen, onClose, filePath, ollamaChat }) => {
    const { authenticated, uploading, progress, error, authenticate, upload, generateMetadata } = useYouTube();
    const [title, setTitle] = useState('ScreenStudio Recording');
    const [description, setDescription] = useState('Recorded with ScreenStudio - Free Screen Recorder');
    const [tags, setTags] = useState('screen recording, screenstudio, tutorial');
    const [privacy, setPrivacy] = useState('unlisted');
    const [categoryId, setCategoryId] = useState('22');
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);

    const handleGenerateAI = useCallback(async () => {
        if (!ollamaChat) return;
        setGenerating(true);
        try {
            const metadata = await generateMetadata(ollamaChat);
            if (metadata) {
                if (metadata.title) setTitle(metadata.title);
                if (metadata.description) setDescription(metadata.description);
                if (metadata.tags) setTags(metadata.tags.join(', '));
                if (metadata.categoryId) setCategoryId(metadata.categoryId);
            }
        } catch {
            // Silent fail
        }
        setGenerating(false);
    }, [ollamaChat, generateMetadata]);

    const handleUpload = useCallback(async () => {
        if (!filePath) return;
        const metadata = {
            title,
            description,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            privacy,
            categoryId,
        };
        const res = await upload(filePath, metadata);
        if (res?.success) {
            setResult(res);
        }
    }, [filePath, title, description, tags, privacy, categoryId, upload]);

    const handleAuth = useCallback(async () => {
        await authenticate();
    }, [authenticate]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content yt-modal" onClick={e => e.stopPropagation()}>
                <div className="yt-modal-header">
                    <h2>Upload to YouTube</h2>
                    <button className="btn-icon-bg" onClick={onClose}>x</button>
                </div>

                <div className="yt-modal-body">
                    {!authenticated ? (
                        <div className="yt-auth-section">
                            <p>Connect your YouTube account to upload recordings directly from ScreenStudio.</p>
                            <p className="yt-auth-note">
                                {window.electronAPI?.isElectron
                                    ? 'A browser window will open for you to sign in to Google.'
                                    : 'YouTube upload requires the desktop app. Download ScreenStudio Desktop.'}
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={handleAuth}
                                disabled={!window.electronAPI?.isElectron}
                            >
                                Connect YouTube Account
                            </button>
                            {error && <p className="yt-error">{error}</p>}
                        </div>
                    ) : result ? (
                        <div className="yt-success-section">
                            <div className="yt-success-icon">Video uploaded successfully</div>
                            <a href={result.url} target="_blank" rel="noopener" className="yt-link">
                                {result.url}
                            </a>
                            <button className="btn btn-primary" onClick={onClose}>Done</button>
                        </div>
                    ) : (
                        <>
                            <div className="yt-field">
                                <div className="yt-field-header">
                                    <label>Title</label>
                                    {ollamaChat && (
                                        <button
                                            className="btn-pill yt-ai-btn"
                                            onClick={handleGenerateAI}
                                            disabled={generating}
                                        >
                                            {generating ? 'Generating...' : 'AI Generate'}
                                        </button>
                                    )}
                                </div>
                                <input
                                    className="yt-input"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    maxLength={100}
                                />
                                <span className="yt-char-count">{title.length}/100</span>
                            </div>

                            <div className="yt-field">
                                <label>Description</label>
                                <textarea
                                    className="yt-textarea"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className="yt-field">
                                <label>Tags (comma separated)</label>
                                <input
                                    className="yt-input"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                />
                            </div>

                            <div className="yt-row">
                                <div className="yt-field yt-field-half">
                                    <label>Privacy</label>
                                    <select
                                        className="yt-select"
                                        value={privacy}
                                        onChange={e => setPrivacy(e.target.value)}
                                    >
                                        {PRIVACY_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="yt-field yt-field-half">
                                    <label>Category</label>
                                    <select
                                        className="yt-select"
                                        value={categoryId}
                                        onChange={e => setCategoryId(e.target.value)}
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {uploading && (
                                <div className="yt-progress">
                                    <div className="yt-progress-bar">
                                        <div className="yt-progress-fill" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span>{progress}%</span>
                                </div>
                            )}

                            {error && <p className="yt-error">{error}</p>}

                            <div className="yt-actions">
                                <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleUpload}
                                    disabled={uploading || !title.trim()}
                                >
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
