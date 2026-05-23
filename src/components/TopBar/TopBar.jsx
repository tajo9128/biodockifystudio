import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import './TopBar.css';

const MODES = [
    { id: 'record', label: 'Record', path: '/recorder', icon: 'REC' },
    { id: 'edit', label: 'Edit', path: '/editor', icon: 'EDIT' },
    { id: 'stream', label: 'Stream', path: '/stream', icon: 'LIVE' },
    { id: 'webinar', label: 'Webinar', path: '/webinar', icon: 'WEB' },
    { id: 'export', label: 'Export', path: '/export', icon: 'OUT' },
];

export const TopBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const currentMode = MODES.find(m => location.pathname.startsWith(m.path))?.id || 'record';

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div className="topbar-logo" onClick={() => navigate('/')}>
                    <div className="topbar-logo-icon">S</div>
                    <span className="topbar-logo-text">ScreenStudio</span>
                </div>
            </div>

            <nav className="topbar-modes">
                {MODES.map(mode => (
                    <button
                        key={mode.id}
                        className={`topbar-mode-btn ${currentMode === mode.id ? 'active' : ''}`}
                        onClick={() => navigate(mode.path)}
                    >
                        <span className="topbar-mode-icon">{mode.icon}</span>
                        <span className="topbar-mode-label">{mode.label}</span>
                    </button>
                ))}
            </nav>

            <div className="topbar-right">
                <button className="topbar-action-btn" onClick={() => navigate('/settings')} title="Settings">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
                </button>
                <button className="topbar-action-btn" onClick={toggleTheme} title="Toggle theme">
                    {theme === 'dark' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                    )}
                </button>
            </div>
        </header>
    );
};
