import React from 'react';
import './SceneSwitcher.css';

export const SceneSwitcher = ({ scenes, activeSceneId, onSelectScene, onAddScene }) => {
    return (
        <div className="scene-switcher">
            {scenes.map((scene, i) => (
                <button
                    key={scene.id}
                    className={`scene-btn ${activeSceneId === scene.id ? 'active' : ''}`}
                    onClick={() => onSelectScene(scene.id)}
                    style={activeSceneId === scene.id ? { borderColor: scene.color || 'var(--primary)' } : {}}
                >
                    <span className="scene-btn-num">{i + 1}</span>
                    <span className="scene-btn-name">{scene.name}</span>
                    <span className="scene-btn-sources">{scene.sources?.length || 0} src</span>
                </button>
            ))}
            <button className="scene-btn scene-btn-add" onClick={() => onAddScene()}>
                <span>+</span>
            </button>
        </div>
    );
};
