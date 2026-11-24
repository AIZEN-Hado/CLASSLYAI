import { useEffect, useState } from 'react';
import api from '../../api/axios';

export const isTelegramVideo = (url) => /t\.me\/c\/\d+\/\d+/.test(url || '');

// Plays a video from the private Telegram channel through the backend stream
const TelegramVideo = ({ lectureId }) => {
    const [src, setSrc] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setSrc('');
        setError('');
        api.get(`/courses/lectures/${lectureId}/stream-token`)
            .then(({ data }) => !cancelled && setSrc(api.defaults.baseURL + data.url))
            .catch(() => !cancelled && setError('Could not load this video'));

        // Keep the free-tier server awake while the lecture is open (also while paused)
        const ping = setInterval(() => api.get('/health').catch(() => {}), 5 * 60 * 1000);
        return () => { cancelled = true; clearInterval(ping); };
    }, [lectureId]);

    if (error || !src) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-400 text-sm">
                {error || 'Loading video...'}
            </div>
        );
    }
    return <video key={src} src={src} controls preload="metadata" className="w-full h-full bg-black" />;
};

export default TelegramVideo;
