// System prompt for AI command parsing
export const SYSTEM_PROMPT = `You are ScreenStudio AI assistant. You help users edit their screen recordings using natural language commands.

When a user describes an edit, respond with ONLY a JSON command object. No explanations, no markdown.

Supported commands:
- trim: {"action":"trim","start":0,"end":5} — trim seconds from start/end
- zoom: {"action":"zoom","time":30,"duration":3,"level":3} — add zoom at timestamp
- title: {"action":"title","text":"Hello","duration":3,"position":"start"} — add title card
- export_gif: {"action":"export_gif","maxDuration":10} — export as GIF
- transcribe: {"action":"transcribe"} — generate subtitles
- set_quality: {"action":"set_quality","quality":"720p"} — change quality
- set_format: {"action":"set_format","format":"webm"} — change format
- cursor_fx: {"action":"cursor_fx","enabled":true} — toggle cursor effects
- annotate: {"action":"annotate","tool":"pen","color":"red"} — switch annotation tool
- countdown: {"action":"countdown","enabled":true} — toggle countdown
- help: {"action":"help"} — show available commands

If the user asks something unrelated to video editing, respond with:
{"action":"chat","message":"I can help you edit recordings. Try: 'trim first 5 seconds' or 'add zoom at 0:30'"}`;

// Command patterns for local parsing (no LLM needed)
export const COMMAND_PATTERNS = [
    {
        patterns: [/trim\s+(?:the\s+)?first\s+(\d+)\s*(?:s|sec|seconds?)/i, /cut\s+(?:the\s+)?first\s+(\d+)\s*(?:s|sec|seconds?)/i],
        handler: (match) => ({ action: 'trim', start: 0, end: parseInt(match[1]) })
    },
    {
        patterns: [/trim\s+(?:the\s+)?last\s+(\d+)\s*(?:s|sec|seconds?)/i, /cut\s+(?:the\s+)?last\s+(\d+)\s*(?:s|sec|seconds?)/i],
        handler: (match) => ({ action: 'trim_end', seconds: parseInt(match[1]) })
    },
    {
        patterns: [/trim\s+(?:from\s+)?(\d+):(\d+)\s+(?:to\s+)?(\d+):(\d+)/i],
        handler: (match) => ({
            action: 'trim',
            start: parseInt(match[1]) * 60 + parseInt(match[2]),
            end: parseInt(match[3]) * 60 + parseInt(match[4])
        })
    },
    {
        patterns: [/zoom\s+(?:at|to)\s+(\d+):(\d+)\s*(?:for\s+)?(\d+)\s*(?:s|sec|seconds?)?/i],
        handler: (match) => ({
            action: 'zoom',
            time: parseInt(match[1]) * 60 + parseInt(match[2]),
            duration: parseInt(match[3]),
            level: 3
        })
    },
    {
        patterns: [/zoom\s+(?:at|to)\s+(\d+)\s*(?:s|sec|seconds?)\s*(?:for\s+)?(\d+)\s*(?:s|sec|seconds?)?/i],
        handler: (match) => ({
            action: 'zoom',
            time: parseInt(match[1]),
            duration: parseInt(match[2]),
            level: 3
        })
    },
    {
        patterns: [/add\s+(?:a\s+)?title\s*[:"]?\s*(.+?)["']?\s*(?:for\s+)?(\d+)\s*(?:s|sec|seconds?)?/i],
        handler: (match) => ({
            action: 'title',
            text: match[1].trim(),
            duration: parseInt(match[2]) || 3,
            position: 'start'
        })
    },
    {
        patterns: [/(?:export|save|convert)\s+(?:as\s+)?gif/i, /make\s+(?:a\s+)?gif/i],
        handler: () => ({ action: 'export_gif', maxDuration: 10 })
    },
    {
        patterns: [/(?:transcribe|subtitles?|caption|srt)/i],
        handler: () => ({ action: 'transcribe' })
    },
    {
        patterns: [/set\s+quality\s+(?:to\s+)?(\w+)/i, /record\s+(?:in\s+)?(\d+p)/i, /(\d+p)\s+quality/i],
        handler: (match) => {
            const q = match[1].toLowerCase();
            const map = { '720': '720p', '720p': '720p', '1080': '1080p', '1080p': '1080p', '1440': '1440p', '1440p': '1440p', '2k': '1440p' };
            return { action: 'set_quality', quality: map[q] || q };
        }
    },
    {
        patterns: [/set\s+format\s+(?:to\s+)?(\w+)/i, /(?:export|save)\s+as\s+(\w+)/i],
        handler: (match) => ({ action: 'set_format', format: match[1].toLowerCase() })
    },
    {
        patterns: [/(?:enable|turn\s+on|show)\s+cursor\s*(?:effects?|fx)?/i],
        handler: () => ({ action: 'cursor_fx', enabled: true })
    },
    {
        patterns: [/(?:disable|turn\s+off|hide)\s+cursor\s*(?:effects?|fx)?/i],
        handler: () => ({ action: 'cursor_fx', enabled: false })
    },
    {
        patterns: [/(?:enable|turn\s+on)\s+(?:drawing|annotations?)/i, /(?:switch|select)\s+(?:to\s+)?(?:pen|pencil)/i],
        handler: () => ({ action: 'annotate', tool: 'pen' })
    },
    {
        patterns: [/select\s+(?:the\s+)?(?:arrow|line|rectangle|text|eraser)\s*(?:tool)?/i, /(?:switch|select)\s+(?:to\s+)?(arrow|line|rect|rectangle|text|eraser)/i],
        handler: (match) => ({ action: 'annotate', tool: match[1].toLowerCase() })
    },
    {
        patterns: [/(?:start|begin)\s+recording/i],
        handler: () => ({ action: 'start_recording' })
    },
    {
        patterns: [/(?:stop|end)\s+recording/i],
        handler: () => ({ action: 'stop_recording' })
    },
    {
        patterns: [/(?:pause)\s+recording/i],
        handler: () => ({ action: 'pause_recording' })
    },
    {
        patterns: [/(?:resume|continue)\s+recording/i],
        handler: () => ({ action: 'resume_recording' })
    },
    {
        patterns: [/help|what can you do|commands/i],
        handler: () => ({ action: 'help' })
    },
];

export const HELP_MESSAGE = `Here's what I can do:

**Recording:**
- "Start recording" / "Stop recording" / "Pause"
- "Set quality to 720p" / "1080p" / "1440p"
- "Export as mp4" / "webm" / "mkv"

**Editing:**
- "Trim first 5 seconds"
- "Trim last 10 seconds"
- "Trim from 0:30 to 1:15"
- "Add zoom at 0:30 for 3 seconds"
- "Add title 'Hello World' for 5 seconds"

**Effects:**
- "Enable cursor effects"
- "Disable cursor effects"
- "Select pen tool" / "arrow" / "rectangle"
- "Enable drawing"

**Export:**
- "Export as GIF"
- "Transcribe" (generates subtitles)

**Settings:**
- "Set quality to 1080p"
- "Set format to webm"`;
