import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AppShell } from './components/AppShell/AppShell';
import LandingPage from './components/LandingPage/LandingPage';
import { RecordMode } from './components/RecordMode/RecordMode';
import { EditMode } from './components/EditMode/EditMode';
import { ExportMode } from './components/ExportMode/ExportMode';
import { SettingsPage } from './components/Settings/SettingsPage';
import './index.css';

function App() {
    return (
        <Router>
            <ThemeProvider>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route element={<AppShell />}>
                            <Route path="/recorder" element={<RecordMode />} />
                            <Route path="/editor" element={<EditMode />} />
                            <Route path="/export" element={<ExportMode />} />
                            <Route path="/settings" element={<SettingsPage />} />
                        </Route>
                    </Routes>
                    <Analytics />
                </div>
            </ThemeProvider>
        </Router>
    );
}

export default App;
