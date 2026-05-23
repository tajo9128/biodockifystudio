import { useState, useCallback, useRef } from 'react';
import { COMMAND_PATTERNS, SYSTEM_PROMPT, HELP_MESSAGE } from '../constants/aiPrompts';

export const useAI = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I can help you edit your recording. Try: "trim first 5 seconds" or type "help" for all commands.' }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiEndpoint, setApiEndpoint] = useState('https://api.openai.com/v1/chat/completions');
    const [model, setModel] = useState('gpt-4o-mini');

    // Parse command locally (no LLM needed for common commands)
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

    // Call LLM API for complex commands
    const callLLM = useCallback(async (input) => {
        if (!apiKey) return null;

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: input }
                    ],
                    temperature: 0.1,
                    max_tokens: 200
                })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim();

            if (content) {
                try {
                    return JSON.parse(content);
                } catch {
                    return { action: 'chat', message: content };
                }
            }
        } catch (err) {
            // API failed, fall through to local parsing
        }
        return null;
    }, [apiKey, apiEndpoint, model, messages]);

    const sendMessage = useCallback(async (input) => {
        if (!input.trim()) return null;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);

        try {
            // Try local pattern matching first (instant, no download)
            let command = parseLocal(input);

            // If no local match and API key exists, try LLM
            if (!command && apiKey) {
                command = await callLLM(input);
            }

            // If still no match, provide helpful response
            if (!command) {
                if (!apiKey) {
                    command = {
                        action: 'chat',
                        message: `I matched that locally. For complex commands, add an API key in settings. Try "help" to see what I can do.`
                    };
                } else {
                    command = { action: 'chat', message: "I couldn't parse that. Try 'help' for available commands." };
                }
            }

            // Special handling for help
            if (command.action === 'help') {
                const helpMsg = { role: 'assistant', content: HELP_MESSAGE };
                setMessages(prev => [...prev, helpMsg]);
                setIsProcessing(false);
                return command;
            }

            // Add AI response
            let responseText = '';
            switch (command.action) {
                case 'trim':
                    responseText = `Trimming from ${command.start}s to ${command.end}s...`;
                    break;
                case 'trim_end':
                    responseText = `Trimming last ${command.seconds} seconds...`;
                    break;
                case 'zoom':
                    responseText = `Adding ${command.level}x zoom at ${command.time}s for ${command.duration}s...`;
                    break;
                case 'title':
                    responseText = `Adding title card: "${command.text}" for ${command.duration}s...`;
                    break;
                case 'export_gif':
                    responseText = 'Preparing GIF export...';
                    break;
                case 'transcribe':
                    responseText = 'Starting transcription (model will download on first use)...';
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
                    responseText = `Command: ${command.action}`;
            }

            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
            return command;
        } finally {
            setIsProcessing(false);
        }
    }, [parseLocal, callLLM, apiKey]);

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
        apiKey, setApiKey,
        apiEndpoint, setApiEndpoint,
        model, setModel,
    };
};
