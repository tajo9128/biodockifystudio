import { useState, useCallback, useEffect } from 'react';

const isElectron = () => typeof window !== 'undefined' && window.electronAPI?.isElectron;

export const useOllama = () => {
    const [connected, setConnected] = useState(false);
    const [model, setModel] = useState('gemma3');
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const checkConnection = useCallback(async () => {
        try {
            if (isElectron()) {
                const result = await window.electronAPI.ollamaStatus();
                setConnected(result.running);
                return result.running;
            }
            // Browser fallback: try direct fetch to Ollama
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
            clearTimeout(timeout);
            setConnected(res.ok);
            return res.ok;
        } catch {
            setConnected(false);
            return false;
        }
    }, []);

    const listModels = useCallback(async () => {
        try {
            if (isElectron()) {
                const result = await window.electronAPI.ollamaModels();
                if (result.success) {
                    setModels(result.models.map(m => m.name));
                    return result.models;
                }
                return [];
            }
            // Browser fallback
            const res = await fetch('http://localhost:11434/api/tags');
            const data = await res.json();
            const modelNames = (data.models || []).map(m => m.name);
            setModels(modelNames);
            return data.models || [];
        } catch {
            return [];
        }
    }, []);

    const chat = useCallback(async (messages, stream = false) => {
        setLoading(true);
        setError(null);
        try {
            if (isElectron()) {
                const result = await window.electronAPI.ollamaChat(model, messages, stream);
                if (result.success) return result.data;
                throw new Error(result.error);
            }
            // Browser fallback
            const res = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, stream }),
            });
            if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
            return await res.json();
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [model]);

    // Auto-check connection and list models on mount
    useEffect(() => {
        checkConnection().then(ok => {
            if (ok) listModels();
        });
        const interval = setInterval(checkConnection, 30000);
        return () => clearInterval(interval);
    }, [checkConnection, listModels]);

    return {
        connected,
        model,
        setModel,
        models,
        loading,
        error,
        chat,
        checkConnection,
        listModels,
    };
};
