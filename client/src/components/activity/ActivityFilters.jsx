import { useRef, useEffect, useState } from 'react';
import { FaChevronDown, FaTimes, FaCalendarAlt, FaSlidersH } from 'react-icons/fa';
import { ALL_ACTIONS, DATE_PRESETS, getDateRange, getActionIcon } from '../../utils/activityUtils';

const ActivityFilters = ({
    searchTerm, setSearchTerm,
    userFilter, setUserFilter,         // pass null/undefined to hide user filter
    selectedActions, setSelectedActions,
    actionSearch, setActionSearch,
    selectedMethod, setSelectedMethod,
    datePreset, setDatePreset,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    actionDropdownOpen, setActionDropdownOpen,
    methodDropdownOpen, setMethodDropdownOpen,
    dateDropdownOpen, setDateDropdownOpen,
    onReset, setPage,
    actions = ALL_ACTIONS,
}) => {
    const actionDropdownRef = useRef(null);
    const methodDropdownRef = useRef(null);
    const dateDropdownRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!actionDropdownOpen) return;
        const handler = (e) => { if (actionDropdownRef.current && !actionDropdownRef.current.contains(e.target)) setActionDropdownOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [actionDropdownOpen]);

    useEffect(() => {
        if (!methodDropdownOpen) return;
        const handler = (e) => { if (methodDropdownRef.current && !methodDropdownRef.current.contains(e.target)) setMethodDropdownOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [methodDropdownOpen]);

    useEffect(() => {
        if (!dateDropdownOpen) return;
        const handler = (e) => { if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) setDateDropdownOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dateDropdownOpen]);


    const toggleAction = (action) => {
        setSelectedActions(prev => prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]);
        setPage(1);
    };

    const handleDatePreset = (preset) => {
        setDatePreset(preset);
        if (preset === 'custom') return;
        const range = getDateRange(preset);
        setDateFrom(range.from);
        setDateTo(range.to);
        setDateDropdownOpen(false);
        setPage(1);
    };

    const inputClass = "w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-white placeholder-zinc-400";
    const dropdownBtnClass = (open) => `w-full flex items-center justify-between px-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border text-sm transition-colors ${open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-zinc-200 dark:border-zinc-700'} text-zinc-900 dark:text-white`;

    const activeCount = (userFilter ? 1 : 0) + (selectedActions.length ? 1 : 0) + (selectedMethod ? 1 : 0) + (datePreset && datePreset !== 'all' ? 1 : 0);

    return (
        <div className="flex flex-col gap-3 mb-6 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 sm:sticky sm:top-navbar z-20">
            <div className="flex flex-wrap gap-2 items-center">
                {/* Search Details */}
                <div className="relative flex-1 min-w-[160px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2a7.5 7.5 0 010 14.65z"/></svg>
                    <input type="text" placeholder="Search details" className={inputClass} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                {/* Mobile: other filters fold behind this button */}
                <button
                    onClick={() => setShowFilters(prev => !prev)}
                    aria-expanded={showFilters}
                    className={`sm:hidden shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'} bg-zinc-50 dark:bg-zinc-800`}
                >
                    <FaSlidersH className="text-xs" />
                    Filters
                    {activeCount > 0 && <span className="text-xs px-1.5 rounded-md bg-blue-600 text-white tabular-nums">{activeCount}</span>}
                </button>

                <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 gap-2 w-full sm:contents`}>
                {/* User Filter (admin only) */}
                {setUserFilter && (
                    <div className="relative col-span-2 sm:flex-1 sm:min-w-[160px]">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        <input type="text" placeholder="Filter by user name or email" className={inputClass} value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
                    </div>
                )}

                {/* Actions Dropdown */}
                <div className="relative w-full sm:w-48 shrink-0" ref={actionDropdownRef}>
                    <button onClick={() => { setActionDropdownOpen(prev => !prev); setActionSearch(''); }} className={dropdownBtnClass(actionDropdownOpen)}>
                        <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                            {selectedActions.length === 0 ? 'All actions' : `${selectedActions.length} selected`}
                        </span>
                        <FaChevronDown className={`text-zinc-400 text-xs shrink-0 ml-2 transition-transform ${actionDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {actionDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                                <input type="text" placeholder="Search actions" value={actionSearch} onChange={e => setActionSearch(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1">
                                {actions.filter(a => a.toLowerCase().includes(actionSearch.toLowerCase())).map(action => {
                                    const isSelected = selectedActions.includes(action);
                                    return (
                                        <button key={action} onClick={() => toggleAction(action)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}>
                                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                                {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                            </span>
                                            {getActionIcon(action)}{action}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedActions.length > 0 && (
                                <div className="border-t border-zinc-100 dark:border-zinc-700 px-3 py-2">
                                    <button onClick={() => { setSelectedActions([]); setPage(1); }} className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors">Clear selection</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Method Dropdown */}
                <div className="relative w-full sm:w-36 shrink-0" ref={methodDropdownRef}>
                    <button onClick={() => setMethodDropdownOpen(prev => !prev)} className={dropdownBtnClass(methodDropdownOpen)}>
                        <span className={`truncate text-sm font-medium ${selectedMethod ? (
                            selectedMethod === 'POST' ? 'text-emerald-600 dark:text-emerald-400' :
                            selectedMethod === 'PUT' ? 'text-amber-600 dark:text-amber-400' :
                            selectedMethod === 'DELETE' ? 'text-red-600 dark:text-red-400' :
                            'text-blue-600 dark:text-blue-400'
                        ) : 'text-zinc-500 dark:text-zinc-400'}`}>{selectedMethod || 'All methods'}</span>
                        <FaChevronDown className={`text-zinc-400 text-xs shrink-0 ml-2 transition-transform ${methodDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {methodDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                            {[{ label: 'All methods', value: '', color: 'text-zinc-500 dark:text-zinc-400' },
                              { label: 'POST', value: 'POST', color: 'text-emerald-600 dark:text-emerald-400' },
                              { label: 'PUT', value: 'PUT', color: 'text-amber-600 dark:text-amber-400' },
                              { label: 'DELETE', value: 'DELETE', color: 'text-red-600 dark:text-red-400' },
                              { label: 'PATCH', value: 'PATCH', color: 'text-blue-600 dark:text-blue-400' },
                            ].map(m => (
                                <button key={m.label} onClick={() => { setSelectedMethod(m.value); setMethodDropdownOpen(false); setPage(1); }}
                                    className={`w-full px-3 py-2 text-xs font-semibold text-left transition-colors ${selectedMethod === m.value ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'} ${m.color}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Date Dropdown */}
                <div className="relative w-full sm:w-44 shrink-0" ref={dateDropdownRef}>
                    <button onClick={() => setDateDropdownOpen(prev => !prev)} className={dropdownBtnClass(dateDropdownOpen)}>
                        <span className="flex items-center gap-2 truncate text-sm text-zinc-500 dark:text-zinc-400">
                            <FaCalendarAlt className="text-xs shrink-0" />
                            {DATE_PRESETS.find(p => p.value === datePreset)?.label || 'All time'}
                        </span>
                        <FaChevronDown className={`text-zinc-400 text-xs shrink-0 ml-2 transition-transform ${dateDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dateDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="py-1">
                                {DATE_PRESETS.map(preset => (
                                    <button key={preset.value} onClick={() => handleDatePreset(preset.value)}
                                        className={`w-full px-3 py-2 text-xs text-left transition-colors ${datePreset === preset.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}>
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            {datePreset === 'custom' && (
                                <div className="border-t border-zinc-100 dark:border-zinc-700 px-3 py-3 space-y-2">
                                    <div>
                                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">From</label>
                                        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                                            className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">To</label>
                                        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                                            className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button onClick={onReset} className="sm:ml-auto px-4 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors shrink-0 flex items-center justify-center gap-1.5">
                    <FaTimes size={11} /> Reset
                </button>
                </div>
            </div>

            {/* Active chips */}
            {selectedActions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedActions.map(action => (
                        <span key={action} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {getActionIcon(action)}{action}
                            <button onClick={() => toggleAction(action)} className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"><FaTimes size={9} /></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityFilters;
