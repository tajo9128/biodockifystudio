import React, { useState, useRef, useEffect, useCallback } from 'react';
import './TeleprompterOverlay.css';

export const TeleprompterOverlay = ({ isOpen, onClose }) => {
    const [text, setText] = useState(() => localStorage.getItem('teleprompter_text') || '');
    const [speed, setSpeed] = useState(2);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('teleprompter_text', text);
    }, [text]);

    const startScroll = useCallback(() => {
        setIsScrolling(true);
    }, []);

    const stopScroll = useCallback(() => {
        setIsScrolling(false);
    }, []);

    useEffect(() => {
        if (!isScrolling || !scrollRef.current) return;
        const el = scrollRef.current;
        const interval = setInterval(() => {
            el.scrollTop += speed * 0.5;
            if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
                setIsScrolling(false);
            }
        }, 30);
        return () => clearInterval(interval);
    }, [isScrolling, speed]);

    if (!isOpen) return null;

    return (
        <div className="teleprompter-overlay">
            <div className="teleprompter-header">
                <span className="teleprompter-title">Teleprompter</span>
                <div className="teleprompter-controls">
                    <label className="teleprompter-speed">
                        Speed:
                        <input
                            type="range"
                            min="1"
                            max="5"
                            step="0.5"
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                        />
                        <span>{speed}x</span>
                    </label>
                    <button
                        className={`btn-pill ${isScrolling ? 'active' : ''}`}
                        onClick={isScrolling ? stopScroll : startScroll}
                    >
                        {isScrolling ? 'Pause' : 'Scroll'}
                    </button>
                    <button className="btn-pill" onClick={() => {
                        if (scrollRef.current) scrollRef.current.scrollTop = 0;
                        setIsScrolling(false);
                    }}>
                        Reset
                    </button>
                    <button className="btn-pill" onClick={onClose}>x</button>
                </div>
            </div>
            <div className="teleprompter-body" ref={scrollRef}>
                {text ? (
                    <div className="teleprompter-text">{text}</div>
                ) : (
                    <textarea
                        className="teleprompter-editor"
                        placeholder="Paste your script here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                )}
                {text && (
                    <button
                        className="btn-pill teleprompter-edit-btn"
                        onClick={() => setText('')}
                        title="Edit script"
                    >
                        Edit
                    </button>
                )}
            </div>
        </div>
    );
};
