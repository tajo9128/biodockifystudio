import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from '../TopBar/TopBar';
import './AppShell.css';

export const AppShell = () => {
    return (
        <div className="app-shell">
            <TopBar />
            <div className="app-shell-body">
                <Outlet />
            </div>
        </div>
    );
};
