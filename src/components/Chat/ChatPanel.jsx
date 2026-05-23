import { useState, useRef, useEffect, useCallback } from 'react';
import { useOllama } from '../../hooks/useOllama';
import { executeCommand } from '../../utils/CommandExecutor';
import './ChatPanel.css';

const SYSTEM_PROMPT = `You are ScreenStudio AI, a video editing assistant inside a screen recorder app. You help users edit their screen recordings using natural language.

Available actions (respond with JSON on a new line after your explanation):
- {"action":"trim","start":0,"end":5} — trim out seconds 0 to 5
- {"action":"zoom","time":30,"duration":3,"level":3} — zoom 3x at 0:30 for 3 seconds
- {"action":"add_text","text":"Hello","time":0,"duration":3,"x":100,"y":100}
- {"action":"set_speed","time":0,"duration":10,"speed":2} — 2x speed for 10 seconds
- {"action":"export_gif","start":0,"end":10} — export as GIF
- {"action":"transcribe"} — transcribe the recording audio
- {"action":"title_card","text":"My Video","duration":3} — add title card
- {"action":"thumbnail","time":5} — extract thumbnail at 5s
- {"action":"blur_bg","amount":10} — blur webcam background
- {"action":"description","generate":true} — generate YouTube title/description
- {"action":"quality","preset":"1080p"} — change recording quality

If the user asks something unrelated to video editing, answer normally and helpfully.
Always keep responses concise.`;

export const ChatPanel = ({ isOpen, onClose, onExecuteCommand, recordingBlob }) => {
    const { connected, model, setModel, models, loading, error, chat } = useOllama();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');

        try {
            const ollamaMessages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...newMessages.map(m => ({ role: m.role, content: m.content })),
            ];

            const response = await chat(ollamaMessages);

            if (response?.message?.content) {
                const aiContent = response.message.content;
                setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);

                // Try to extract and execute a command
                const jsonMatch = aiContent.match(/\{[\s\S]*?"action"\s*:\s*"[^"]+"[\s\S]*?\}/);
                if (jsonMatch && onExecuteCommand) {
                    try {
                        const command = JSON.parse(jsonMatch[0]);
                        const result = await executeCommand(command, recordingBlob);
                        if (result) {
                            setMessages(prev => [...prev, {
                                role: 'system',
                                content: `Executed: ${command.action} ${result.success ? '✓' : '✗ ' + result.error}`,
                            }]);
                            if (onExecuteCommand) onExecuteCommand(command, result);
                        }
                    } catch {
                        // Not a valid JSON command, that's fine
                    }
                }
            } else if (error) {
                setMessages(prev => [...prev, { role: 'system', content: `Error: ${error}` }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'system', content: `Error: ${err.message}` }]);
        }
    }, [input, loading, messages, chat, error, onExecuteCommand, recordingBlob]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const clearChat = useCallback(() => {
        setMessages([]);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div className="chat-header-left">
                    <span className="chat-icon">AI</span>
                    <div>
                        <h3>ScreenStudio AI</h3>
                        <span className={`chat-status ${connected ? 'connected' : 'disconnected'}`}>
                            {connected ? `Connected: ${model}` : 'Ollama not detected'}
                        </span>
                    </div>
                </div>
                <div className="chat-header-right">
                    {connected && models.length > 0 && (
                        <select
                            className="chat-model-select"
                            value={model}
                            onChange={e => setModel(e.target.value)}
                        >
                            {models.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    )}
                    <button className="btn-icon-bg" onClick={clearChat} title="Clear chat">Clear</button>
                    <button className="btn-icon-bg" onClick={onClose} title="Close">x</button>
                </div>
            </div>

            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-empty">
                        {!connected ? (
                            <>
                                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Ollama not detected</p>
                                <p>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener">ollama.com</a> and run a model (e.g. <code>ollama pull gemma3</code>) to use AI features.</p>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Ask me to edit your recording</p>
                                <p>Try: "Trim the first 5 seconds" or "Add a title card" or "Transcribe this"</p>
                            </>
                        )}
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-message chat-${msg.role}`}>
                        <div className="chat-bubble">
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="chat-message chat-assistant">
                        <div className="chat-bubble chat-loading">Thinking...</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <textarea
                    ref={inputRef}
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={connected ? "Ask me to edit your recording..." : "Start Ollama to use AI..."}
                    disabled={!connected}
                    rows={2}
                />
                <button
                    className="btn btn-primary chat-send-btn"
                    onClick={handleSend}
                    disabled={!connected || !input.trim() || loading}
                >
                    Send
                </button>
            </div>
        </div>
    );
};
