import { FaGithub } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-4 transition-colors duration-300 mt-auto relative z-50">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Built by <span className="font-medium text-zinc-900 dark:text-white">Ayush kumar singh</span></p>

                <a
                    href="https://github.com/trex-ayush"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                    <FaGithub size={20} />
                    <span className="text-sm font-medium">trex-ayush</span>
                </a>
            </div>
        </footer>
    );
};

export default Footer;
