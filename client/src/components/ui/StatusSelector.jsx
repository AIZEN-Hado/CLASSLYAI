import { useState, useRef, useEffect } from 'react';
import { FaCheckCircle, FaPlayCircle, FaRegCircle, FaChevronDown, FaCheck } from 'react-icons/fa';

const StatusSelector = ({ status, onChange, disabled, customStatuses = [], progressData = null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const currentStatuses = customStatuses;

    if (!currentStatuses || currentStatuses.length === 0) {
        return <div className="text-[11px] text-zinc-400 font-semibold py-2 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg italic">No statuses set</div>;
    }

    const options = currentStatuses.map(s => ({
        value: s.label,
        label: s.label,
        color: s.color,
        icon: s.label === 'Completed' ? <FaCheckCircle style={{ color: s.color }} /> :
            s.label === 'In Progress' ? <FaPlayCircle style={{ color: s.color }} /> :
                <FaRegCircle style={{ color: s.color }} />
    }));

    const currentOption = options.find(opt => opt.value === status) || options[0];

    // If progressData is provided, render as a progress card
    if (progressData) {
        const { completedCount, totalCount, percentage } = progressData;

        // Determine progress color based on percentage
        const getProgressColor = () => {
            if (percentage >= 80) return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-900/30' };
            if (percentage >= 50) return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/30' };
            if (percentage >= 20) return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/30' };
            return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/30' };
        };

        const getEncouragingMessage = () => {
            if (percentage === 100) return "Course complete";
            if (percentage >= 80) return "Almost done";
            if (percentage >= 50) return "Past the halfway mark";
            if (percentage >= 20) return "In progress";
            return "Just getting started";
        };

        const colors = getProgressColor();

        return (
            <div className="relative" ref={dropdownRef}>
                {/* Progress Card */}
                <div className={`bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border ${colors.border} p-3 sm:p-4 shadow-sm transition duration-200`}>
                    {/* Header with Status Selector */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Your progress</h3>
                            <div className="flex items-baseline gap-1.5 sm:gap-2">
                                <span className={`text-2xl sm:text-3xl font-semibold ${colors.text}`}>{percentage}%</span>
                                <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium">{completedCount}/{totalCount} Lectures</span>
                            </div>
                        </div>

                        {/* Current Lecture Status Button */}
                        <button
                            type="button"
                            className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-lg border transition duration-200 shadow-sm shrink-0"
                            style={{
                                backgroundColor: disabled ? '#f3f4f6' : `${currentOption.color}15`,
                                borderColor: disabled ? '#e5e7eb' : `${currentOption.color}40`,
                                color: disabled ? '#9ca3af' : currentOption.color,
                                opacity: disabled ? 0.5 : 1,
                                cursor: disabled ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => !disabled && setIsOpen(!isOpen)}
                            disabled={disabled}
                        >
                            <span className="text-xs sm:text-sm">{currentOption.icon}</span>
                            <span className="hidden sm:inline">{currentOption.label}</span>
                            {!disabled && (
                                <FaChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} opacity-50`} />
                            )}
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-2 sm:h-2.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden mb-2 sm:mb-3">
                        <div
                            className={`h-full ${colors.bg} transition duration-500 ease-out rounded-full`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    {/* Encouraging Message */}
                    <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        {getEncouragingMessage()}
                    </p>
                </div>

                {/* Dropdown for changing status */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 focus:outline-none z-[9999] overflow-hidden">
                        <div className="p-1">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${status === option.value
                                        ? 'bg-zinc-50 dark:bg-zinc-800'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                                        }`}
                                    style={status === option.value ? { color: option.color } : {}}
                                >
                                    <span className="shrink-0 text-base">{option.icon}</span>
                                    {option.label}
                                    {status === option.value && <span className="ml-auto text-xs font-semibold" style={{ color: option.color }}><FaCheck /></span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Original simple button style (fallback if no progressData)
    const getButtonStyle = () => {
        if (disabled) return { opacity: 0.5, cursor: 'not-allowed' };

        return {
            backgroundColor: `${currentOption.color}15`,
            borderColor: `${currentOption.color}30`,
            color: currentOption.color
        };
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                className={`group inline-flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition duration-200 shadow-sm`}
                style={getButtonStyle()}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <div className="flex items-center gap-2">
                    {currentOption.icon}
                    <span>{currentOption.label}</span>
                </div>
                {!disabled && (
                    <FaChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} opacity-50`} />
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 focus:outline-none z-[9999] overflow-hidden">
                    <div className="p-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${status === option.value
                                    ? 'bg-zinc-50 dark:bg-zinc-800'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                                    }`}
                                style={status === option.value ? { color: option.color } : {}}
                            >
                                <span className="shrink-0 text-base">{option.icon}</span>
                                {option.label}
                                {status === option.value && <span className="ml-auto text-xs font-semibold" style={{ color: option.color }}><FaCheck /></span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusSelector;
