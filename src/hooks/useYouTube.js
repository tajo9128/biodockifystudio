import { useState, useCallback, useRef } from 'react';

// Google Identity Services + YouTube Data API v3
// Works in any browser — no Electron needed
// User provides their own Google Cloud OAuth Client ID

const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const YOUTUBE_CHANNEL_URL = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube';

export const useYouTube = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [channelName, setChannelName] = useState('');
    const [clientId, setClientIdState] = useState(() => localStorage.getItem('yt_client_id') || '');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const tokenRef = useRef(null);

    const setClientId = useCallback((id) => {
        setClientIdState(id);
        localStorage.setItem('yt_client_id', id);
    }, []);

    const loadGis = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts?.oauth2) { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
            document.head.appendChild(script);
        });
    }, []);

    const authenticate = useCallback(async () => {
        if (!clientId) return false;
        try {
            await loadGis();
        } catch {
            return false;
        }

        return new Promise((resolve) => {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: async (tokenResponse) => {
                    if (tokenResponse.error) {
                        resolve(false);
                        return;
                    }
                    tokenRef.current = tokenResponse.access_token;
                    setIsAuthenticated(true);

                    try {
                        const res = await fetch(YOUTUBE_CHANNEL_URL, {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                        });
                        const data = await res.json();
                        if (data.items?.[0]?.snippet?.title) {
                            setChannelName(data.items[0].snippet.title);
                        }
                    } catch { /* silent */ }
                    resolve(true);
                },
            });
            tokenClient.requestAccessToken();
        });
    }, [clientId, loadGis]);

    const disconnect = useCallback(() => {
        if (tokenRef.current) {
            try { window.google?.accounts?.oauth2?.revoke(tokenRef.current); } catch { /* silent */ }
        }
        tokenRef.current = null;
        setIsAuthenticated(false);
        setChannelName('');
    }, []);

    const uploadVideo = useCallback(async (blob, metadata) => {
        if (!tokenRef.current || !blob) return null;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const videoMetadata = {
                snippet: {
                    title: metadata.title || 'ScreenStudio Recording',
                    description: metadata.description || 'Recorded with ScreenStudio',
                    tags: metadata.tags || ['screen recording', 'screenstudio'],
                    categoryId: metadata.categoryId || '22',
                },
                status: {
                    privacyStatus: metadata.privacy || 'unlisted',
                },
            };

            // Step 1: Initiate resumable upload session
            const initRes = await fetch(YOUTUBE_UPLOAD_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${tokenRef.current}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Type': blob.type || 'video/webm',
                    'X-Upload-Content-Length': String(blob.size),
                },
                body: JSON.stringify(videoMetadata),
            });

            if (!initRes.ok) {
                const errBody = await initRes.text().catch(() => '');
                throw new Error(`Upload init failed: ${initRes.status} ${errBody}`);
            }

            const uploadUrl = initRes.headers.get('Location');
            if (!uploadUrl) throw new Error('No upload URL returned');

            // Step 2: Upload video blob with progress tracking
            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl, true);
                xhr.setRequestHeader('Content-Type', blob.type || 'video/webm');

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); }
                        catch { reject(new Error('Invalid upload response')); }
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(blob);
            });

            setUploadProgress(100);
            return { success: true, url: `https://youtube.com/watch?v=${result.id}`, videoId: result.id };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setIsUploading(false);
        }
    }, []);

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
        isAuthenticated, channelName,
        clientId, setClientId,
        authenticate, disconnect,
        uploadVideo, isUploading, uploadProgress,
        generateMetadata,
    };
};
