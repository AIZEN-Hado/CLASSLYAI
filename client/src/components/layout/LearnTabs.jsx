import { Suspense, useContext, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { FaStore, FaGraduationCap, FaChalkboardTeacher } from 'react-icons/fa';
import AuthContext from '../../context/AuthContext';
import TabLabel from '../ui/TabLabel';

const tabs = [
    { to: '/marketplace', label: 'Marketplace', icon: FaStore },
    { to: '/my-learning', label: 'My learning', icon: FaGraduationCap, count: 'enrolled' },
    { to: '/my-courses', label: 'My courses', icon: FaChalkboardTeacher, count: 'created' },
];

// Shared layout so the tab bar stays mounted (and animates) across these three routes
const LearnTabs = () => {
    const { user } = useContext(AuthContext);
    const [counts, setCounts] = useState({});

    return (
        <>
            {user && (
                <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                    <div className="container mx-auto px-4 flex gap-1">
                        {tabs.map(({ to, label, icon: Icon, count }) => (
                            <NavLink
                                key={to}
                                to={to}
                                aria-label={label}
                                className={({ isActive }) => `flex shrink-0 items-center px-4 py-3 text-sm font-medium border-b-2 transition ${isActive
                                    ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon className="text-sm shrink-0" />
                                        <TabLabel active={isActive}>
                                            {label}
                                            {counts[count] > 0 && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 tabular-nums">
                                                    {counts[count]}
                                                </span>
                                            )}
                                        </TabLabel>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}
            <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />}>
                <Outlet context={{ setCounts }} />
            </Suspense>
        </>
    );
};

export default LearnTabs;
