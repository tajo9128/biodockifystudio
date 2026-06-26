import React, { useState } from 'react';
import './TransitionLibrary.css';

const TRANSITIONS = [
    { id: 'cross-dissolve', name: 'Cross Dissolve', type: 'transition', icon: 'X' },
    { id: 'fade-to-black', name: 'Fade to Black', type: 'transition', icon: 'B' },
    { id: 'wipe-left', name: 'Wipe Left', type: 'transition', icon: 'L' },
    { id: 'wipe-right', name: 'Wipe Right', type: 'transition', icon: 'R' },
    { id: 'slide-left', name: 'Slide Left', type: 'transition', icon: 'S' },
    { id: 'zoom-in', name: 'Zoom In', type: 'transition', icon: 'Z' },
];

const EFFECTS = [
    { id: 'drop-shadow', name: 'Drop Shadow', type: 'effect', icon: 'D' },
    { id: 'glow', name: 'Glow', type: 'effect', icon: 'G' },
    { id: 'blur', name: 'Blur', type: 'effect', icon: 'B' },
    { id: 'sharpen', name: 'Sharpen', type: 'effect', icon: 'S' },
    { id: 'vignette', name: 'Vignette', type: 'effect', icon: 'V' },
    { id: 'color-grade', name: 'Color Grade', type: 'effect', icon: 'C' },
];

const CALLOUTS = [
    { id: 'text-box', name: 'Text Box', type: 'callout', icon: 'T' },
    { id: 'arrow', name: 'Arrow', type: 'callout', icon: 'A' },
    { id: 'blur-box', name: 'Blur Box', type: 'callout', icon: 'B' },
    { id: 'highlight', name: 'Highlight', type: 'callout', icon: 'H' },
];

export const TransitionLibrary = () => {
    const [activeTab, setActiveTab] = useState('transitions');
    const [searchQuery, setSearchQuery] = useState('');

    const items = activeTab === 'transitions' ? TRANSITIONS
        : activeTab === 'effects' ? EFFECTS
        : CALLOUTS;

    const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDragStart = (e, item) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="tl-library">
            <div className="tl-library-header">
                <h3>Library</h3>
            </div>

            <div className="tl-library-tabs">
                <button className={`tl-lib-tab ${activeTab === 'transitions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transitions')}>Transitions</button>
                <button className={`tl-lib-tab ${activeTab === 'effects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('effects')}>Effects</button>
                <button className={`tl-lib-tab ${activeTab === 'callouts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('callouts')}>Callouts</button>
            </div>

            <input
                className="tl-library-search"
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="tl-library-items">
                {filtered.map(item => (
                    <div
                        key={item.id}
                        className={`tl-lib-item tl-lib-item-${item.type}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                    >
                        <div className="tl-lib-item-icon">{item.icon}</div>
                        <span className="tl-lib-item-name">{item.name}</span>
                    </div>
                ))}
            </div>

            <div className="tl-library-hint">
                Drag to timeline to apply
            </div>
        </div>
    );
};
