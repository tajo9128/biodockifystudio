import { useState, useCallback } from 'react';
import { COMMAND_PATTERNS, SYSTEM_PROMPT, HELP_MESSAGE } from '../constants/aiPrompts';

export const useAI = (ollama = null) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I can help you edit your recording. Try: "trim first 5 seconds" or type "help" for all commands.' }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') || '');
    const [apiEndpoint, setApiEndpoint] = useState(() => localStorage.getItem('ai_api_endpoint') || 'https://api.openai.com/v1/chat/completions');
    const [model, setModel] = useState(() => localStorage.getItem('ai_model') || 'gpt-4o-mini');

    // Save settings
    const updateApiKey = useCallback((key) => {
        setApiKey(key);
        localStorage.setItem('ai_api_key', key);
    }, []);

    const updateApiEndpoint = useCallback((url) => {
        setApiEndpoint(url);
        localStorage.setItem('ai_api_endpoint', url);
    }, []);

    const updateModel = useCallback((m) => {
        setModel(m);
        localStorage.setItem('ai_model', m);
    }, []);

    // Parse command locally (instant, no LLM needed)
    const parseLocal = useCallback((input) => {
        const text = input.trim();
        for (const { patterns, handler } of COMMAND_PATTERNS) {
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) return handler(match);
            }
        }
        return null;
    }, []);

    // Call Ollama (local, free)
    const callOllama = useCallback(async (input, recentMessages) => {
        if (!ollama?.connected) return null;

        try {
            const ollamaMessages = recentMessages.map(m => ({
                role: m.role,
                content: m.content,
            }));
            ollamaMessages.push({ role: 'user', content: input });

            const content = await ollama.chat(ollamaMessages, SYSTEM_PROMPT);
            if (content) {
                try {
                    // Try to extract JSON from response
                    const jsonMatch = content.match(/\{[^}]+\}/);
                    if (jsonMatch) return JSON.parse(jsonMatch[0]);
                    return { action: 'chat', message: content };
                } catch {
                    return { action: 'chat', message: content };
                }
            }
        } catch {
            // Ollama failed, fall through
        }
        return null;
    }, [ollama]);

    // Call external API (OpenAI-compatible)
    const callAPI = useCallback(async (input, recentMessages) => {
        if (!apiKey) return null;

        try {
            const apiMessages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...recentMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: input },
            ];

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: apiMessages,
                    temperature: 0.1,
                    max_tokens: 200,
                }),
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim();

            if (content) {
                try {
                    const jsonMatch = content.match(/\{[^}]+\}/);
                    if (jsonMatch) return JSON.parse(jsonMatch[0]);
                    return { action: 'chat', message: content };
                } catch {
                    return { action: 'chat', message: content };
                }
            }
        } catch {
            // API failed
        }
        return null;
    }, [apiKey, apiEndpoint, model]);

    const sendMessage = useCallback(async (input) => {
        if (!input.trim()) return null;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);

        try {
            // 1. Try local pattern matching first (instant)
            let command = parseLocal(input);

            // 2. If no local match, try Ollama (free, local)
            if (!command && ollama?.connected) {
                command = await callOllama(input, messages);
            }

            // 3. If no Ollama, try external API
            if (!command && apiKey) {
                command = await callAPI(input, messages);
            }

            // 4. If still nothing, provide helpful response
            if (!command) {
                const hasOllama = ollama?.connected;
                const hasAPI = !!apiKey;
                let hint = '';

                if (!hasOllama && !hasAPI) {
                    hint = 'Commands are parsed locally. For complex edits, connect Ollama or add an API key in settings.';
                } else if (hasOllama) {
                    hint = 'Ollama couldn\'t parse that. Try rephrasing or type "help".';
                } else {
                    hint = 'Try "help" for available commands.';
                }

                command = { action: 'chat', message: hint };
            }

            // Special handling for help
            if (command.action === 'help') {
                setMessages(prev => [...prev, { role: 'assistant', content: HELP_MESSAGE }]);
                setIsProcessing(false);
                return command;
            }

            // Build response text
            let responseText = '';
            switch (command.action) {
                case 'trim':
                    responseText = `Trimming from ${command.start}s to ${command.end}s...`;
                    break;
                case 'trim_end':
                    responseText = `Trimming last ${command.seconds} seconds...`;
                    break;
                case 'zoom':
                    responseText = `Adding ${command.level || 3}x zoom at ${command.time}s for ${command.duration}s...`;
                    break;
                case 'title':
                    responseText = `Adding title: "${command.text}" for ${command.duration}s...`;
                    break;
                case 'export_gif':
                    responseText = 'Preparing GIF export...';
                    break;
                case 'transcribe':
                    responseText = 'Starting transcription...';
                    break;
                case 'set_quality':
                    responseText = `Setting quality to ${command.quality}...`;
                    break;
                case 'set_format':
                    responseText = `Setting format to ${command.format}...`;
                    break;
                case 'cursor_fx':
                    responseText = `Cursor effects ${command.enabled ? 'enabled' : 'disabled'}.`;
                    break;
                case 'annotate':
                    responseText = `Switched to ${command.tool} tool.`;
                    break;
                case 'start_recording':
                    responseText = 'Starting recording...';
                    break;
                case 'stop_recording':
                    responseText = 'Stopping recording...';
                    break;
                case 'pause_recording':
                    responseText = 'Pausing recording...';
                    break;
                case 'resume_recording':
                    responseText = 'Resuming recording...';
                    break;
                case 'chat':
                    responseText = command.message;
                    break;
                default:
                    responseText = `Done: ${command.action}`;
            }

            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
            return command;
        } finally {
            setIsProcessing(false);
        }
    }, [parseLocal, callOllama, callAPI, apiKey, ollama, messages]);

    const clearMessages = useCallback(() => {
        setMessages([
            { role: 'assistant', content: 'Chat cleared. How can I help?' }
        ]);
    }, []);

    return {
        messages,
        isProcessing,
        sendMessage,
        clearMessages,
        apiKey, setApiKey: updateApiKey,
        apiEndpoint, setApiEndpoint: updateApiEndpoint,
        model, setModel: updateModel,
    };
};
