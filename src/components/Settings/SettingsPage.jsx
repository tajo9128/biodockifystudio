import React, { useState, useEffect } from 'react';
import './SettingsPage.css';

const API_ENDPOINTS = [
    { id: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions' },
    { id: 'anthropic', label: 'Anthropic', url: 'https://api.anthropic.com/v1/messages' },
    { id: 'custom', label: 'Custom', url: '' },
];

export const SettingsPage = () => {
    // AI Provider settings
    const [ollamaStatus, setOllamaStatus] = useState('checking');
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('ollama_model') || '');
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('llm_api_key') || '');
    const [apiEndpoint, setApiEndpoint] = useState(() => localStorage.getItem('llm_endpoint') || 'https://api.openai.com/v1/chat/completions');
    const [apiModel, setApiModel] = useState(() => localStorage.getItem('llm_model') || 'gpt-4o-mini');
    const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('llm_provider') || 'openai');
    const [ollamaEndpoint, setOllamaEndpoint] = useState(() => localStorage.getItem('ollama_endpoint') || '');

    // Recording defaults
    const [defaultQuality, setDefaultQuality] = useState(() => localStorage.getItem('rec_quality') || '1080p');
    const [defaultFormat, setDefaultFormat] = useState(() => localStorage.getItem('rec_format') || 'webm');
    const [saveFolder, setSaveFolder] = useState(() => localStorage.getItem('save_folder') || 'Downloads');

    // YouTube
    const [ytClientId, setYtClientId] = useState(() => localStorage.getItem('yt_client_id') || '');

    useEffect(() => {
        checkOllama();
    }, []);

    const checkOllama = async () => {
        setOllamaStatus('checking');
        const endpoints = [
            ollamaEndpoint || 'http://localhost:11434',
            '/api/ollama',
        ];
        for (const base of endpoints) {
            try {
                const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    const data = await res.json();
                    setOllamaModels(data.models?.map(m => m.name) || []);
                    setOllamaStatus('connected');
                    return;
                }
            } catch {}
        }
        setOllamaStatus('disconnected');
        setOllamaModels([]);
    };

    const saveSetting = (key, value) => {
        localStorage.setItem(key, value);
    };

    return (
        <div className="settings-page">
            <div className="settings-page-inner">
                <div className="settings-header">
                    <h1>Settings</h1>
                    <p>Configure AI providers, recording defaults, and more</p>
                </div>

                {/* AI Provider */}
                <section className="settings-section">
                    <div className="settings-section-header">
                        <h2>AI Provider</h2>
                        <span className="settings-badge">
                            {ollamaStatus === 'connected' ? 'Ollama Connected' : ollamaStatus === 'checking' ? 'Checking...' : 'Ollama Offline'}
                        </span>
                    </div>

                    <div className="settings-card">
                        <h3>Ollama (Free, Local)</h3>
                        <p className="settings-desc">Run AI commands locally with Ollama. No API key needed.</p>

                        <div className="settings-field">
                            <label>Connection Status</label>
                            <div className="settings-row">
                                <span className={`settings-status ${ollamaStatus}`}>
                                    {ollamaStatus === 'connected' ? `Connected (${ollamaModels.length} models)` :
                                     ollamaStatus === 'checking' ? 'Checking...' : 'Not connected'}
                                </span>
                                <button className="btn btn-outline btn-sm" onClick={checkOllama}>Refresh</button>
                            </div>
                        </div>

                        <div className="settings-field">
                            <label>Ollama Endpoint (optional)</label>
                            <input
                                className="settings-input"
                                value={ollamaEndpoint}
                                onChange={e => { setOllamaEndpoint(e.target.value); saveSetting('ollama_endpoint', e.target.value); }}
                                placeholder="http://localhost:11434 (default)"
                            />
                        </div>

                        {ollamaModels.length > 0 && (
                            <div className="settings-field">
                                <label>Default Model</label>
                                <select
                                    className="settings-select"
                                    value={selectedModel}
                                    onChange={e => { setSelectedModel(e.target.value); saveSetting('ollama_model', e.target.value); }}
                                >
                                    <option value="">Auto (first available)</option>
                                    {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="settings-card">
                        <h3>Paid API (OpenAI-Compatible)</h3>
                        <p className="settings-desc">Use OpenAI, Anthropic, or any OpenAI-compatible API as fallback when Ollama is unavailable.</p>

                        <div className="settings-field">
                            <label>Provider</label>
                            <div className="settings-option-row">
                                {API_ENDPOINTS.map(p => (
                                    <button
                                        key={p.id}
                                        className={`settings-option-btn ${apiProvider === p.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setApiProvider(p.id);
                                            saveSetting('llm_provider', p.id);
                                            if (p.url) { setApiEndpoint(p.url); saveSetting('llm_endpoint', p.url); }
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-field">
                            <label>API Endpoint</label>
                            <input
                                className="settings-input"
                                value={apiEndpoint}
                                onChange={e => { setApiEndpoint(e.target.value); saveSetting('llm_endpoint', e.target.value); }}
                                placeholder="https://api.openai.com/v1/chat/completions"
                            />
                        </div>

                        <div className="settings-field">
                            <label>API Key</label>
                            <input
                                className="settings-input"
                                type="password"
                                value={apiKey}
                                onChange={e => { setApiKey(e.target.value); saveSetting('llm_api_key', e.target.value); }}
                                placeholder="sk-..."
                            />
                        </div>

                        <div className="settings-field">
                            <label>Model</label>
                            <input
                                className="settings-input"
                                value={apiModel}
                                onChange={e => { setApiModel(e.target.value); saveSetting('llm_model', e.target.value); }}
                                placeholder="gpt-4o-mini"
                            />
                        </div>
                    </div>
                </section>

                {/* Recording Defaults */}
                <section className="settings-section">
                    <div className="settings-section-header">
                        <h2>Recording Defaults</h2>
                    </div>

                    <div className="settings-card">
                        <div className="settings-field">
                            <label>Default Quality</label>
                            <div className="settings-option-row">
                                {['720p', '1080p', '2K'].map(q => (
                                    <button
                                        key={q}
                                        className={`settings-option-btn ${defaultQuality === q ? 'active' : ''}`}
                                        onClick={() => { setDefaultQuality(q); saveSetting('rec_quality', q); }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-field">
                            <label>Default Format</label>
                            <div className="settings-option-row">
                                {['webm', 'mp4', 'mkv'].map(f => (
                                    <button
                                        key={f}
                                        className={`settings-option-btn ${defaultFormat === f ? 'active' : ''}`}
                                        onClick={() => { setDefaultFormat(f); saveSetting('rec_format', f); }}
                                    >
                                        {f.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* YouTube */}
                <section className="settings-section">
                    <div className="settings-section-header">
                        <h2>YouTube Upload</h2>
                    </div>

                    <div className="settings-card">
                        <p className="settings-desc">Enter your Google Cloud OAuth 2.0 Client ID to enable direct YouTube upload from the browser.</p>
                        <div className="settings-field">
                            <label>OAuth Client ID</label>
                            <input
                                className="settings-input"
                                value={ytClientId}
                                onChange={e => { setYtClientId(e.target.value); saveSetting('yt_client_id', e.target.value); }}
                                placeholder="xxxxx.apps.googleusercontent.com"
                            />
                        </div>
                        <a className="settings-link" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">
                            Create credentials at Google Cloud Console
                        </a>
                    </div>
                </section>

                {/* About */}
                <section className="settings-section">
                    <div className="settings-section-header">
                        <h2>About</h2>
                    </div>
                    <div className="settings-card">
                        <div className="settings-about">
                            <div className="settings-about-logo">S</div>
                            <div>
                                <h3>ScreenStudio</h3>
                                <p>Free & Open Source Screen Recorder</p>
                                <p className="settings-about-ver">v1.0.0</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
