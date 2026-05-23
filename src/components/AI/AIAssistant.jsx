import React, { useState, useRef, useEffect } from 'react';
import './AIAssistant.css';

export const AIAssistant = ({
    isOpen, onToggle,
    messages, isProcessing, onSend, onClear,
    ollamaConnected, ollamaModel, ollamaModels, onCheckOllama,
    apiKey, onApiKeyChange,
}) => {
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            onCheckOllama?.();
        }
    }, [isOpen, onCheckOllama]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;
        onSend(input);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <>
            {/* Floating trigger button */}
            <button className={`ai-fab ${isOpen ? 'active' : ''}`} onClick={onToggle} title="AI Assistant">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                    <circle cx="8.5" cy="14.5" r="1.5"/>
                    <circle cx="15.5" cy="14.5" r="1.5"/>
                </svg>
                {!isOpen && <span className="ai-fab-pulse"></span>}
            </button>

            {/* Chat drawer */}
            {isOpen && (
                <div className="ai-drawer">
                    <div className="ai-drawer-header">
                        <div className="ai-drawer-header-left">
                            <span className="ai-drawer-title">AI Assistant</span>
                            <span className={`ai-drawer-status ${ollamaConnected ? 'connected' : apiKey ? 'api' : 'local'}`}>
                                {ollamaConnected ? `Ollama: ${ollamaModel || 'ready'}` : apiKey ? 'API' : 'Local'}
                            </span>
                        </div>
                        <div className="ai-drawer-header-right">
                            <button className="ai-drawer-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                                </svg>
                            </button>
                            <button className="ai-drawer-btn" onClick={onClear} title="Clear">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                            <button className="ai-drawer-btn" onClick={onToggle} title="Close">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {showSettings && (
                        <div className="ai-drawer-settings">
                            <div className="ai-setting-row">
                                <span>Ollama</span>
                                <span className={`ai-status-dot ${ollamaConnected ? 'on' : 'off'}`}></span>
                                <span className="ai-setting-val">{ollamaConnected ? `Connected` : 'Offline'}</span>
                                <button className="ai-drawer-btn-sm" onClick={onCheckOllama}>Refresh</button>
                            </div>
                            {ollamaConnected && ollamaModels?.length > 0 && (
                                <div className="ai-setting-row">
                                    <span>Model</span>
                                    <select className="ai-setting-select" value={ollamaModel || ''} onChange={() => {}}>
                                        {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="ai-setting-row">
                                <span>API Key</span>
                                <input
                                    className="ai-setting-input"
                                    type="password"
                                    value={apiKey || ''}
                                    onChange={e => onApiKeyChange?.(e.target.value)}
                                    placeholder="sk-..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="ai-drawer-messages">
                        {messages.length === 0 && (
                            <div className="ai-drawer-empty">
                                <p>Ask me to edit your video</p>
                                <div className="ai-suggestions">
                                    {['Trim first 5 seconds', 'Add zoom effect', 'Export as MP4', 'Set brightness +20'].map(s => (
                                        <button key={s} className="ai-suggestion" onClick={() => onSend(s)}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`ai-msg ${msg.role}`}>
                                <div className="ai-msg-content">{msg.content}</div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="ai-msg assistant">
                                <div className="ai-msg-content ai-typing">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="ai-drawer-input" onSubmit={handleSubmit}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask AI to edit..."
                            disabled={isProcessing}
                        />
                        <button type="submit" disabled={isProcessing || !input.trim()}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};
