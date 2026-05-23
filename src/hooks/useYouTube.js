import { useState, useCallback } from 'react';

const isElectron = () => typeof window !== 'undefined' && window.electronAPI?.isElectron;

export const useYouTube = () => {
    const [authenticated, setAuthenticated] = useState(false);
    const [tokens, setTokens] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const authenticate = useCallback(async () => {
        try {
            if (!isElectron()) {
                setError('YouTube upload requires the desktop app. Use Electron version.');
                return false;
            }
            const result = await window.electronAPI.youtubeAuth();
            if (result.success) {
                setTokens(result.tokens);
                setAuthenticated(true);
                setError(null);
                return true;
            }
            setError(result.error);
            return false;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    const upload = useCallback(async (filePath, metadata) => {
        if (!tokens) {
            const authResult = await authenticate();
            if (!authResult) return null;
        }
        setUploading(true);
        setProgress(0);
        setError(null);
        try {
            if (!isElectron()) {
                setError('YouTube upload requires the desktop app.');
                return null;
            }
            setProgress(10);
            const result = await window.electronAPI.youtubeUpload(filePath, metadata, tokens);
            setProgress(100);
            if (result.success) {
                return result;
            }
            setError(result.error);
            return null;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setUploading(false);
        }
    }, [tokens, authenticate]);

    const generateMetadata = useCallback(async (ollamaChat, transcription) => {
        try {
            const systemPrompt = `You are a YouTube SEO expert. Generate a title, description, and tags for a screen recording video.
Respond ONLY with valid JSON in this format:
{"title": "...", "description": "...", "tags": ["tag1", "tag2"], "categoryId": "22"}

Rules:
- Title: max 100 chars, catchy, include keywords
- Description: 2-3 sentences, include keywords naturally
- Tags: 5-10 relevant tags
- categoryId: "22" for People & Blogs, "28" for Science & Technology, "27" for Education`;

            const userContent = transcription
                ? `This is a transcription of the recording:\n\n${transcription}\n\nGenerate YouTube metadata for this video.`
                : 'Generate YouTube metadata for a screen recording video. The user did not provide a transcription.';

            const response = await ollamaChat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ]);

            if (response?.message?.content) {
                // Extract JSON from response
                const jsonMatch = response.message.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    return {
        authenticated,
        tokens,
        uploading,
        progress,
        error,
        authenticate,
        upload,
        generateMetadata,
    };
};
