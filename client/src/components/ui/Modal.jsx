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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-ios-dark-bg2 rounded-t-ios-2xl sm:rounded-ios-2xl shadow-2xl w-full sm:max-w-lg border-t border-black/5 dark:border-white/5 sm:border transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-9 h-1 rounded-full bg-ios-gray3 dark:bg-ios-dark-bg4" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
                    <h3 className="text-[17px] font-semibold text-slate-900 dark:text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-ios-gray5 dark:bg-ios-dark-bg3 flex items-center justify-center text-ios-gray hover:text-ios-red active:scale-90 transition-all"
                    >
                        <FaTimes size={12} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
