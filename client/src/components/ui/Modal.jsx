import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
            <div
                className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg border border-zinc-100 dark:border-zinc-800 transform transition scale-100 opacity-100 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
