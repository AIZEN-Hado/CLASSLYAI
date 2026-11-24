import { Link, useLocation } from 'react-router-dom';
import { FaRobot } from 'react-icons/fa';

const FloatingAIChatButton = () => {
    const location = useLocation();

    // Hide on AI chat and AI settings pages (already there)
    if (location.pathname === '/ai-chat' || location.pathname === '/ai-settings') return null;

    return (
        <Link
            to="/ai-chat"
            className="ai-fab fixed bottom-6 right-4 md:bottom-10 md:right-10 z-50 group"
            title="AI Chat Assistant"
        >
            <div className="relative">

                {/* Button */}
                <div className="relative w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-center transition-colors active:scale-[0.97]">
                    <FaRobot className="text-lg" />
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    AI Chat
                    <div className="absolute top-full right-5 w-2 h-2 bg-zinc-900 dark:bg-zinc-700 rotate-45 -mt-1" />
                </div>
            </div>
        </Link>
    );
};

export default FloatingAIChatButton;
