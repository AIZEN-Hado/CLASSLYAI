import { useEffect, useState } from 'react';
import api from '../../api/axios';

export const isTelegramVideo = (url) => /t\.me\/c\/\d+\/\d+/.test(url || '');

// Plays a lecture from the private Telegram channel straight in the browser
const TelegramVideo = ({ lectureId, url }) => {
    const [src, setSrc] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setSrc('');
        setError('');
        (async () => {
            const [{ data }, { prepareTelegramVideo }] = await Promise.all([
                api.get(`/courses/lectures/${lectureId}/telegram`),
                import('../../lib/telegramPlayer'), // GramJS is large, load it only here
            ]);
            const videoSrc = await prepareTelegramVideo(data);
            if (!cancelled) setSrc(videoSrc);
        })().catch(() => !cancelled && setError('Could not load this video'));
        return () => { cancelled = true; };
    }, [lectureId]);

    if (error || !src) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 text-zinc-400 text-sm">
                <span>{error || 'Connecting to Telegram...'}</span>
                {error && (
                    <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">
                        Open in Telegram
                    </a>
                )}
            </div>
        );
    }
    return <video key={src} src={src} controls preload="metadata" className="w-full h-full bg-black" />;
};

export default TelegramVideo;
