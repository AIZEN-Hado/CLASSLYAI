import { useState, useMemo } from 'react';
import { FaBullhorn, FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaSearch, FaTimes } from 'react-icons/fa';
import Modal from '../ui/Modal';
import LinkifiedText from '../ui/LinkifiedText';
import Pagination from '../ui/Pagination';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../api/axios';

const BroadcastList = ({
    courseId,
    broadcasts,
    pagination,
    currentPage,
    onPageChange,
    onRefresh,
    canBroadcast = false,
    isOwner = false,
    allowStudentBroadcasts = false,
    onToggleStudentBroadcasts,
    currentUserId
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBroadcast, setEditingBroadcast] = useState(null);
    const [newBroadcast, setNewBroadcast] = useState({ title: '', message: '', priority: 'normal' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // Filter broadcasts
    const filteredBroadcasts = useMemo(() => {
        return broadcasts.filter((broadcast) => {
            // Search filter
            const matchesSearch = searchQuery === '' ||
                broadcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                broadcast.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                broadcast.createdBy?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            // Priority filter
            const matchesPriority = priorityFilter === 'all' || broadcast.priority === priorityFilter;

            return matchesSearch && matchesPriority;
        });
    }, [broadcasts, searchQuery, priorityFilter]);

    // Check if filters are active
    const hasActiveFilters = searchQuery !== '' || priorityFilter !== 'all';

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setPriorityFilter('all');
    };

    // Create broadcast
    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/broadcasts/course/${courseId}`, newBroadcast);
            setNewBroadcast({ title: '', message: '', priority: 'normal' });
            setIsCreateModalOpen(false);
            onRefresh();
            showSuccess('Broadcast sent');
        } catch (error) {
            showError(error, 'Error sending broadcast');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update broadcast
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingBroadcast) return;
        setIsSubmitting(true);
        try {
            await api.put(`/broadcasts/${editingBroadcast._id}`, {
                title: editingBroadcast.title,
                message: editingBroadcast.message,
                priority: editingBroadcast.priority,
                isActive: editingBroadcast.isActive
            });
            setIsEditModalOpen(false);
            setEditingBroadcast(null);
            onRefresh();
            showSuccess('Broadcast updated');
        } catch (error) {
            showError(error, 'Error updating broadcast');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete broadcast
    const handleDelete = async (broadcastId) => {
        if (!confirm('Are you sure you want to delete this broadcast?')) return;
        try {
            await api.delete(`/broadcasts/${broadcastId}`);
            onRefresh();
            showSuccess('Broadcast deleted');
        } catch (error) {
            showError(error, 'Error deleting broadcast');
        }
    };

    // Check if user can edit/delete a broadcast
    const canEditBroadcast = (broadcast) => {
        if (!currentUserId) return false;
        return isOwner || broadcast.createdBy?._id === currentUserId;
    };

    // Priority indicator
    const getPriorityIndicator = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-500';
            case 'important':
                return 'bg-amber-500';
            default:
                return 'bg-zinc-300 dark:bg-zinc-600';
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-white">
                    {isOwner ? 'Broadcasts' : 'Announcements'}
                </h2>
                <div className="flex items-center gap-2">
                    {isOwner && onToggleStudentBroadcasts && (
                        <button
                            onClick={onToggleStudentBroadcasts}
                            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md font-medium border transition ${allowStudentBroadcasts
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                                }`}
                            title={allowStudentBroadcasts ? 'Students can post' : 'Only you can post'}
                        >
                            {allowStudentBroadcasts ? <FaToggleOn size={12} /> : <FaToggleOff size={12} />}
                            <span className="hidden sm:inline">Students</span>
                        </button>
                    )}
                    {canBroadcast && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition bg-blue-600 hover:bg-blue-700 text-white shadow-md "
                        >
                            <FaPlus size={10} /> New
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            {broadcasts.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={12} />
                        <input
                            type="text"
                            placeholder="Search announcements"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Priority Filter */}
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition"
                    >
                        <option value="all">All</option>
                        <option value="urgent">Urgent</option>
                        <option value="important">Important</option>
                        <option value="normal">Normal</option>
                    </select>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Clear filters"
                        >
                            <FaTimes size={12} />
                        </button>
                    )}
                </div>
            )}

            {/* Broadcast List */}
            {broadcasts.length > 0 ? (
                <>
                    {filteredBroadcasts.length > 0 ? (
                        <div className="space-y-3">
                            {filteredBroadcasts.map((broadcast) => {
                                const borderColor = broadcast.priority === 'urgent' ? 'border-l-red-500' : broadcast.priority === 'important' ? 'border-l-amber-500' : 'border-l-zinc-300 dark:border-l-zinc-700';
                                return (
                                <div
                                    key={broadcast._id}
                                    className={`group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-l-[3px] ${borderColor} rounded-xl p-4 dark:hover:border-zinc-700 transition ${broadcast.isActive === false ? 'opacity-50' : ''}`}
                                >
                                    {/* Top row: Title + Priority + Actions */}
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${getPriorityIndicator(broadcast.priority)}`} />
                                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                                {broadcast.title}
                                            </h4>
                                            {broadcast.isActive === false && (
                                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        {canEditBroadcast(broadcast) && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setEditingBroadcast({ ...broadcast });
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                >
                                                    <FaEdit size={11} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(broadcast._id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
                                                >
                                                    <FaTrash size={11} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Message */}
                                    <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2 mb-3 pl-[18px]">
                                        <LinkifiedText text={broadcast.message} />
                                    </p>

                                    {/* Footer - inline */}
                                    <div className="flex items-center justify-between pl-[18px]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shadow-sm">
                                                <span className="text-[11px] font-semibold text-white">
                                                    {broadcast.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                {broadcast.createdBy?.name || 'Unknown'}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                                            {new Date(broadcast.createdAt).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">No broadcasts match your filters</p>
                            <button
                                onClick={clearFilters}
                                className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}

                    {/* Pagination - compact (only show if no filters applied) */}
                    {!hasActiveFilters && (
                        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={pagination.pages}
                                totalItems={pagination.total}
                                itemsPerPage={pagination.limit || 5}
                                onPageChange={(newPage) => onPageChange(newPage)}
                                showLimitSelector={false}
                            />
                        </div>
                    )}

                    {/* Filter results count */}
                    {hasActiveFilters && (
                        <div className="mt-3 text-center">
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                {filteredBroadcasts.length} of {broadcasts.length} shown
                            </span>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <FaBullhorn className="text-zinc-400 dark:text-blue-500/80" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-white mb-2">No announcements</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">Updates from the instructor will appear here</p>
                    {canBroadcast && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium transition bg-blue-600 hover:bg-blue-700 text-white shadow-lg "
                        >
                            <FaPlus size={10} /> Create announcement
                        </button>
                    )}
                </div>
            )}

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="New Broadcast"
            >
                <form onSubmit={handleCreate} className="space-y-3">
                    <div>
                        <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                            value={newBroadcast.title}
                            onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                            placeholder="Brief title"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                            Message
                        </label>
                        <textarea
                            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 min-h-[80px] resize-none"
                            value={newBroadcast.message}
                            onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
                            placeholder="Your message"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                            Priority
                        </label>
                        <select
                            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                            value={newBroadcast.priority}
                            onChange={(e) => setNewBroadcast({ ...newBroadcast, priority: e.target.value })}
                        >
                            <option value="normal">Normal</option>
                            <option value="important">Important</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-xs font-medium transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingBroadcast(null);
                }}
                title="Edit Broadcast"
            >
                {editingBroadcast && (
                    <form onSubmit={handleUpdate} className="space-y-3">
                        <div>
                            <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                                Title
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                                value={editingBroadcast.title}
                                onChange={(e) => setEditingBroadcast({ ...editingBroadcast, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                                Message
                            </label>
                            <textarea
                                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 min-h-[80px] resize-none"
                                value={editingBroadcast.message}
                                onChange={(e) => setEditingBroadcast({ ...editingBroadcast, message: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                                    Priority
                                </label>
                                <select
                                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                                    value={editingBroadcast.priority}
                                    onChange={(e) => setEditingBroadcast({ ...editingBroadcast, priority: e.target.value })}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="important">Important</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                                    Status
                                </label>
                                <select
                                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                                    value={editingBroadcast.isActive ? 'active' : 'inactive'}
                                    onChange={(e) => setEditingBroadcast({ ...editingBroadcast, isActive: e.target.value === 'active' })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingBroadcast(null);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-xs font-medium transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default BroadcastList;
