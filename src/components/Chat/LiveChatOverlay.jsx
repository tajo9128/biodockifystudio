import React, { useState, useRef, useEffect } from 'react';
import './LiveChatOverlay.css';

export const LiveChatOverlay = ({ messages, onShowOnScreen, onClear }) => {
    const [pinned, setPinned] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleShowOnScreen = (msg) => {
        setPinned(msg);
        onShowOnScreen?.(msg);
        setTimeout(() => setPinned(null), 5000);
    };

    return (
        <div className="live-chat-overlay">
            <div className="live-chat-header">
                <span className="live-chat-title">Live Chat</span>
                <span className="live-chat-count">{messages.length}</span>
                <button className="live-chat-clear" onClick={onClear}>Clear</button>
            </div>

            <div className="live-chat-messages">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`live-chat-msg ${pinned?.id === msg.id ? 'pinned' : ''}`}
                    >
                        <span className="live-chat-author" style={{ color: msg.color }}>
                            {msg.authorName || msg.author}
                        </span>
                        <span className="live-chat-text">{msg.text}</span>
                        <button
                            className="live-chat-show-btn"
                            onClick={() => handleShowOnScreen(msg)}
                            title="Show on screen"
                        >
                            On Screen
                        </button>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};
