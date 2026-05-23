import React, { useState } from 'react';
import { FILTERS, getDefaultParams, getFilterList } from '../../utils/FilterEngine';
import './FilterPanel.css';

export const FilterPanel = ({ isOpen, onClose, activeFilters, setActiveFilters, embedded = false }) => {
    const [selectedFilter, setSelectedFilter] = useState(null);
    const filterList = getFilterList();

    if (!isOpen) return null;

    const addFilter = (filterId) => {
        if (activeFilters.find(f => f.filterId === filterId)) return;
        setActiveFilters(prev => [...prev, {
            filterId,
            params: getDefaultParams(filterId)
        }]);
        setSelectedFilter(filterId);
    };

    const removeFilter = (filterId) => {
        setActiveFilters(prev => prev.filter(f => f.filterId !== filterId));
        if (selectedFilter === filterId) setSelectedFilter(null);
    };

    const updateParam = (filterId, paramKey, value) => {
        setActiveFilters(prev => prev.map(f => {
            if (f.filterId !== filterId) return f;
            return { ...f, params: { ...f.params, [paramKey]: value } };
        }));
    };

    const currentFilter = selectedFilter ? activeFilters.find(f => f.filterId === selectedFilter) : null;
    const currentFilterDef = selectedFilter ? FILTERS[selectedFilter] : null;

    const categories = {};
    filterList.forEach(f => {
        const cat = f.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(f);
    });

    const content = (
        <>
            <div className="filter-section-title">Available Filters</div>
            {Object.entries(categories).map(([cat, filters]) => (
                <div key={cat} className="filter-category">
                    <div className="filter-category-label">{cat}</div>
                    <div className="filter-category-items">
                        {filters.map(f => {
                            const isActive = activeFilters.some(af => af.filterId === f.id);
                            return (
                                <button
                                    key={f.id}
                                    className={`filter-item ${isActive ? 'active' : ''} ${selectedFilter === f.id ? 'selected' : ''}`}
                                    onClick={() => isActive ? setSelectedFilter(f.id) : addFilter(f.id)}
                                >
                                    <span className="filter-icon">{f.icon}</span>
                                    <span className="filter-name">{f.name}</span>
                                    {isActive && (
                                        <button
                                            className="filter-remove"
                                            onClick={(e) => { e.stopPropagation(); removeFilter(f.id); }}
                                        >
                                            x
                                        </button>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {currentFilter && currentFilterDef && (
                <div className="filter-params">
                    <div className="filter-section-title">{currentFilterDef.name} Settings</div>
                    {Object.entries(currentFilterDef.params).map(([key, config]) => (
                        <div key={key} className="filter-param">
                            <label>{config.label || key}</label>
                            {config.type === 'toggle' ? (
                                <button
                                    className={`filter-toggle ${currentFilter.params[key] ?? config.default ? 'on' : 'off'}`}
                                    onClick={() => updateParam(selectedFilter, key, !(currentFilter.params[key] ?? config.default))}
                                >
                                    {currentFilter.params[key] ?? config.default ? 'ON' : 'OFF'}
                                </button>
                            ) : config.type === 'color' ? (
                                <input
                                    type="color"
                                    className="filter-color"
                                    value={currentFilter.params[key] ?? config.default}
                                    onChange={e => updateParam(selectedFilter, key, e.target.value)}
                                />
                            ) : (
                                <div className="filter-slider-row">
                                    <input
                                        type="range"
                                        className="filter-slider"
                                        min={config.min}
                                        max={config.max}
                                        step={config.step}
                                        value={currentFilter.params[key] ?? config.default}
                                        onChange={e => updateParam(selectedFilter, key, parseFloat(e.target.value))}
                                    />
                                    <span className="filter-value">{currentFilter.params[key] ?? config.default}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    if (embedded) {
        return <div className="filter-panel-embedded">{content}</div>;
    }

    return (
        <div className="filter-overlay" onClick={onClose}>
            <div className="filter-panel" onClick={e => e.stopPropagation()}>
                <div className="filter-panel-header">
                    <h3>Filters</h3>
                    <button className="btn-icon-bg" onClick={onClose}>x</button>
                </div>
                <div className="filter-panel-body">{content}</div>
            </div>
        </div>
    );
};
