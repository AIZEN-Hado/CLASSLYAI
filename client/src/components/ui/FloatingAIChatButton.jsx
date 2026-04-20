import { Link, useLocation } from 'react-router-dom';
import { FaRobot } from 'react-icons/fa';

const FloatingAIChatButton = () => {
    const location = useLocation();

    // Hide on AI chat and AI settings pages (already there)
    if (location.pathname === '/ai-chat' || location.pathname === '/ai-settings') return null;

    return (
        <Link
            to="/ai-chat"
            className="fixed bottom-20 md:bottom-6 right-5 z-50 group"
            title="AI Chat Assistant"
        >
            <div className="relative">
                {/* Pulse ring */}
                <div className="absolute inset-0 bg-ios-purple rounded-full animate-ping opacity-20" />

                {/* Button - iOS style: solid color, large corner radius, subtle shadow */}
                <div className="relative w-14 h-14 bg-ios-purple hover:opacity-90 active:scale-90 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-150">
                    <FaRobot className="text-xl" />
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-ios-dark-bg2 text-white text-[13px] font-medium rounded-ios shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    AI Chat
                    <div className="absolute top-full right-5 w-2 h-2 bg-ios-dark-bg2 rotate-45 -mt-1" />
                </div>
            </div>
        </Link>
    );
};

export default FloatingAIChatButton;
