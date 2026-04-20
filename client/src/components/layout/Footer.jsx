import { FaGithub, FaHeart } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-white/75 dark:bg-ios-dark-bg2/75 backdrop-blur-xl border-t border-black/10 dark:border-white/10 py-4 transition-colors duration-300 mt-auto relative z-50">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-1.5 text-[13px] text-ios-gray dark:text-ios-gray2">
                    <span>Made with </span>
                    <FaHeart className="text-ios-red animate-pulse" />
                    <span>by <span className="font-semibold text-slate-900 dark:text-white">Ayush Kumar Singh</span></span>
                </div>

                <a
                    href="https://github.com/trex-ayush"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-ios-gray dark:text-ios-gray2 hover:text-ios-blue dark:hover:text-ios-blue active:opacity-70 transition-colors"
                >
                    <FaGithub size={18} />
                    <span className="text-[13px] font-medium">trex-ayush</span>
                </a>
            </div>
        </footer>
    );
};

export default Footer;
