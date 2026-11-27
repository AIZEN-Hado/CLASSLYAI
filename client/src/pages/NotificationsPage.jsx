import { useState, useEffect } from 'react';
import LinkifiedText from '../components/ui/LinkifiedText';
import ExpandableText from '../components/ui/ExpandableText';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaCheck, FaCheckDouble, FaRobot, FaBullhorn, FaBook, FaClipboardList, FaClock, FaTrophy, FaPaperPlane, FaTrash, FaArrowLeft } from 'react-icons/fa';
import api from '../api/axios';
import Pagination from '../components/ui/Pagination';

const typeConfig = {
    new_content: { icon: FaBook, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'New Content' },
    broadcast: { icon: FaBullhorn, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Announcement' },
    quiz: { icon: FaClipboardList, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Quiz' },
    due_date: { icon: FaClock, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Due Date' },
    ai_access: { icon: FaRobot, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'AI Access' },
    milestone: { icon: FaTrophy, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Milestone' },
    custom: { icon: FaPaperPlane, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800', label: 'Custom' },
};

const priorityBadge = {
    urgent: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800',
    important: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    normal: ''
};

const NotificationsPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [filter, setFilter] = useState('all');
    const limit = 15;

    const fetchNotifications = async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get(`/notifications?page=${p}&limit=${limit}`);
            setNotifications(res.data.notifications);
            setPagination(res.data.pagination);
        } catch {} finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications(page);
    }, [page]);

    // Auto mark all as read on page load (like broadcasts)
    useEffect(() => {
        api.put('/notifications/mark-all-read').catch(() => {});
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch {}
    };

    const handleMarkRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        } catch {}
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch {}
    };

    const handleClick = (notif) => {
        if (!notif.read) handleMarkRead(notif._id);
        if (notif.link) navigate(notif.link);
    };

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString();
    };

    const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-zinc-50 dark:bg-zinc-950 transition-colors">
            <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                        <FaArrowLeft size={14} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Notifications</h1>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <FaCheckDouble size={10} /> Mark all read
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 mb-5 border-b border-zinc-200 dark:border-zinc-800">
                    {[{ v: 'all', l: 'All' }, { v: 'unread', l: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` }].map(f => (
                        <button
                            key={f.v}
                            onClick={() => setFilter(f.v)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${filter === f.v
                                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
                        >
                            {f.l}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FaBell className="text-zinc-300 dark:text-zinc-600" size={24} />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </h3>
                        <p className="text-xs text-zinc-400">{filter === 'unread' ? 'You\'re all caught up!' : 'Notifications from your courses will appear here'}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(notif => {
                            const config = typeConfig[notif.type] || typeConfig.custom;
                            const Icon = config.icon;
                            return (
                                <div
                                    key={notif._id}
                                    onClick={() => handleClick(notif)}
                                    className={`group relative bg-white dark:bg-zinc-900 rounded-xl border transition cursor-pointer ${!notif.read
                                        ? 'border-blue-200 dark:border-blue-800/50 shadow-sm'
                                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                                >
                                    {/* Unread indicator bar */}
                                    {!notif.read && (
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />
                                    )}

                                    <div className="flex items-start gap-3 px-4 py-3.5">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                                            <Icon className={config.color} size={16} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-snug ${!notif.read ? 'font-medium text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                {notif.title}
                                            </p>
                                            {notif.message && (
                                                <ExpandableText className="text-xs text-zinc-500 dark:text-zinc-400 mt-1"><LinkifiedText text={notif.message} /></ExpandableText>
                                            )}
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>{config.label}</span>
                                                {notif.course?.title && (
                                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md truncate max-w-[160px]">{notif.course.title}</span>
                                                )}
                                                {priorityBadge[notif.priority] && (
                                                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${priorityBadge[notif.priority]}`}>{notif.priority}</span>
                                                )}
                                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-auto">{timeAgo(notif.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notif.read && (
                                                <button onClick={(e) => { e.stopPropagation(); handleMarkRead(notif._id); }} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-zinc-400 hover:text-green-500 transition-colors" title="Mark as read">
                                                    <FaCheck size={10} />
                                                </button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(notif._id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors" title="Delete">
                                                <FaTrash size={10} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="mt-6">
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.pages}
                            totalItems={pagination.total}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
