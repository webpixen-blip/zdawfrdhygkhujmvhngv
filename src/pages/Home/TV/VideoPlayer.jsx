import { memo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaServer } from 'react-icons/fa';

const SOURCES = [
  { name: 'Server 1 (VidSrc.cc)', url: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
  { name: 'Server 2 (VidLink)', url: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=c45454&secondaryColor=a2a2a2&iconColor=eefdec&poster=true&title=true&nextbutton=false&player=jw&autoplay=true` },
  { name: 'Server 3 (VidSrc RU)', url: (id, s, e) => `https://vidsrc-embed.ru/embed/tv/${id}/${s}/${e}` },
  { name: 'Server 4 (Super)', url: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
];

const VideoPlayer = ({ tvId, season = 1, episode = 1, gdriveUrl }) => {
    const [shouldRender, setShouldRender] = useState(false);
    const [sourceIdx, setSourceIdx] = useState(0);

    // Helper to get Google Drive embed URL
    const getGDriveEmbed = (url) => {
        if (!url) return '';
        try {
            const idMatch = url.match(/[-\w]{25,}/);
            const id = idMatch ? idMatch[0] : '';
            return `https://drive.google.com/file/d/${id}/preview`;
        } catch {
            return url;
        }
    };

    const isGDrive = !!gdriveUrl;
    const iframeSrc = isGDrive ? getGDriveEmbed(gdriveUrl) : SOURCES[sourceIdx].url(tvId, season, episode);

    useEffect(() => {
        setShouldRender(false);
        const timer = setTimeout(() => setShouldRender(true), 150);
        return () => clearTimeout(timer);
    }, [tvId, season, episode, sourceIdx, gdriveUrl]);

    if (!tvId && !isGDrive) return null;

    return (
        <div className="w-full flex flex-col gap-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 px-1">
                <FaServer className="text-gray-400 text-sm mr-1" />
                <span className="text-sm text-gray-400 font-medium mr-2">Source:</span>
                
                {isGDrive && (
                    <button
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white shadow-md cursor-default flex items-center gap-2"
                    >
                        <FaServer /> Main Server (GDrive)
                    </button>
                )}

                {!isGDrive && SOURCES.map((src, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSourceIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            sourceIdx === idx 
                                ? 'bg-red-600 text-white shadow-md' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {src.name}
                    </button>
                ))}
            </div>

            {/* Player */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden ring-1 ring-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                {shouldRender && (
                    <iframe
                        key={iframeSrc}
                        src={iframeSrc}
                        title={`Streaming Content`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="fullscreen; picture-in-picture; encrypted-media;"
                        allowFullScreen
                        webkitallowfullscreen="true"
                        mozallowfullscreen="true"
                        referrerPolicy="origin"
                    />
                )}
            </div>
        </div>
    );
}

VideoPlayer.propTypes = {
    tvId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    season: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    episode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gdriveUrl: PropTypes.string,
};

export default memo(VideoPlayer);