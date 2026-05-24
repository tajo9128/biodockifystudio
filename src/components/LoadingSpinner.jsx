import React from 'react';

const spinnerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#a0a0a0',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
};

const dotStyle = {
    width: '20px',
    height: '20px',
    border: '2px solid #333',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'ss-spin 0.8s linear infinite',
};

export const LoadingSpinner = ({ text = 'Loading...', size = 'md' }) => {
    const scale = size === 'sm' ? 0.6 : size === 'lg' ? 1.5 : 1;
    return (
        <span style={spinnerStyle}>
            <span style={{ ...dotStyle, width: `${20 * scale}px`, height: `${20 * scale}px` }} />
            {text && <span>{text}</span>}
        </span>
    );
};

// Inline CSS animation (injected once)
if (typeof document !== 'undefined' && !document.getElementById('ss-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'ss-spinner-style';
    style.textContent = '@keyframes ss-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
}
