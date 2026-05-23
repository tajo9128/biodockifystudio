import React, { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

export const ChatPanel = ({
    isOpen,
    onClose,
    messages,
    isProcessing,
    onSend,
    onClear,
    apiKey,
    onApiKeyChange,
}) => {
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div className="chat-header-left">
                    <span className="chat-icon">AI</span>
                    <span className="chat-title">ScreenStudio AI</span>
                    <span className={`chat-status ${apiKey ? 'connected' : 'local'}`}>
                        {apiKey ? 'API' : 'Local'}
                    </span>
                </div>
                <div className="chat-header-right">
                    <button className="btn-icon-sm" onClick={() => setShowSettings(!showSettings)} title="Settings">
                        *
                    </button>
                    <button className="btn-icon-sm" onClick={onClear} title="Clear chat">
                        C
                    </button>
                    <button className="btn-icon-sm" onClick={onClose} title="Close">
                        x
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="chat-settings">
                    <label>
                        <span>API Key (optional)</span>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => onApiKeyChange(e.target.value)}
                            placeholder="sk-... (OpenAI compatible)"
                            className="chat-input-sm"
                        />
                    </label>
                    <p className="chat-settings-hint">
                        Without an API key, commands are parsed locally (instant). With an API key, complex natural language works.
                    </p>
                </div>
            )}

            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-msg ${msg.role}`}>
                        <div className="chat-msg-content">
                            {msg.content.split('\n').map((line, j) => (
                                <p key={j}>{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="chat-msg assistant">
                        <div className="chat-msg-content">
                            <span className="typing-indicator">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Try "trim first 5 seconds" or "help"'
                    disabled={isProcessing}
                    className="chat-input"
                />
                <button type="submit" disabled={!input.trim() || isProcessing} className="chat-send-btn">
                    Send
                </button>
            </form>
        </div>
    );
};
