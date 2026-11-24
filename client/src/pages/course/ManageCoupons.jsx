import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTag, FaPercent, FaRupeeSign, FaChevronLeft, FaChevronRight, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

const ManageCoupons = ({ embeddedCourseId }) => {
    const courseId = embeddedCourseId;

    if (!courseId) return null;

    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [couponToDelete, setCouponToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCoupons, setTotalCoupons] = useState(0);
    const LIMIT = 5;

    const [formData, setFormData] = useState({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        maxUses: '',
        validUntil: ''
    });

    useEffect(() => {
        fetchData(page);
    }, [courseId, page]);

    const fetchData = async (currentPage = 1) => {
        try {
            const couponsRes = await api.get(`/coupons/course/${courseId}?page=${currentPage}&limit=${LIMIT}`);

            if (couponsRes.data.coupons) {
                setCoupons(couponsRes.data.coupons);
                setTotalPages(couponsRes.data.pages);
                setTotalCoupons(couponsRes.data.total);
            } else {
                setCoupons(couponsRes.data);
                setTotalPages(1);
                setTotalCoupons(couponsRes.data.length);
            }
        } catch (error) {
            showError('Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            discountType: 'percentage',
            discountValue: '',
            maxUses: '',
            validUntil: ''
        });
        setEditingCoupon(null);
        setShowModal(false);
    };

    const handleEdit = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            maxUses: coupon.maxUses || '',
            validUntil: new Date(coupon.validUntil).toISOString().split('T')[0]
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.code.trim()) {
            showError('Please enter a coupon code');
            return;
        }
        if (!formData.discountValue || formData.discountValue <= 0) {
            showError('Please enter a valid discount value');
            return;
        }
        if (!formData.validUntil) {
            showError('Please select an expiry date');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                code: formData.code.toUpperCase(),
                courseId,
                discountType: formData.discountType,
                discountValue: Number(formData.discountValue),
                maxUses: formData.maxUses ? Number(formData.maxUses) : null,
                validUntil: formData.validUntil
            };

            if (editingCoupon) {
                await api.put(`/coupons/${editingCoupon._id}`, payload);
                showSuccess('Coupon updated');
            } else {
                await api.post('/coupons', payload);
                showSuccess('Coupon created');
            }

            resetForm();
            fetchData(page);
        } catch (error) {
            showError(error, 'Failed to save coupon');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (coupon) => {
        setCouponToDelete(coupon);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!couponToDelete) return;

        setDeleting(true);
        try {
            await api.delete(`/coupons/${couponToDelete._id}`);
            showSuccess('Coupon deleted');
            fetchData(page);
            setShowDeleteModal(false);
            setCouponToDelete(null);
        } catch (error) {
            showError('Failed to delete coupon');
        } finally {
            setDeleting(false);
        }
    };

    const toggleCouponStatus = async (coupon) => {
        try {
            await api.put(`/coupons/${coupon._id}`, { isActive: !coupon.isActive });
            showSuccess(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated');
            fetchData(page);
        } catch (error) {
            showError('Failed to update coupon');
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    if (loading) {
        return (
            <div className="p-12 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header matching CourseSettings Design */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-zinc-500">
                    Active Coupons ({totalCoupons})
                </h2>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-transparent rounded-lg transition-colors text-xs font-medium "
                >
                    <FaPlus /> Create coupon
                </button>
            </div>

            {/* Coupons List - No inner rounded borders, just list items */}
            <div className="flex-1">
                {coupons.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                            <FaTag className="text-2xl" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                            No coupons yet
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400">
                            Create your first coupon to offer discounts!
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {coupons.map(coupon => {
                            const isExpired = new Date(coupon.validUntil) < new Date();
                            const isLimitReached = coupon.maxUses && coupon.usedCount >= coupon.maxUses;

                            return (
                                <div key={coupon._id} className="px-6 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-mono font-semibold text-lg text-zinc-900 dark:text-white border-2 border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded bg-white dark:bg-zinc-900">
                                                    {coupon.code}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] uppercase font-semibold ${!coupon.isActive
                                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                                        : isExpired
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                            : isLimitReached
                                                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                    {!coupon.isActive ? 'Inactive' : isExpired ? 'Expired' : isLimitReached ? 'Limit Reached' : 'Active'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                                                    {coupon.discountType === 'percentage' ? <FaPercent className="text-xs" /> : <FaRupeeSign className="text-xs" />}
                                                    {coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : ''} OFF
                                                </span>
                                                <span>
                                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{coupon.usedCount}</span> uses {coupon.maxUses ? `/ ${coupon.maxUses} max` : '(unlimited)'}
                                                </span>
                                                <span>
                                                    Ends: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatDate(coupon.validUntil)}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <button
                                                onClick={() => toggleCouponStatus(coupon)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition border ${coupon.isActive
                                                        ? 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 dark:hover:border-white dark:hover:text-white bg-transparent'
                                                        : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md'
                                                    }`}
                                            >
                                                {coupon.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700 mx-1 hidden sm:block"></div>
                                            <button
                                                onClick={() => handleEdit(coupon)}
                                                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(coupon)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-center gap-4">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-zinc-900 dark:hover:border-white hover:text-zinc-900 dark:hover:text-white transition"
                        >
                            <FaChevronLeft />
                        </button>
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-zinc-900 dark:hover:border-white hover:text-zinc-900 dark:hover:text-white transition"
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                )}
            </div>

            {/* Edit/Create Modal (Same as before) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 transform transition scale-100">
                        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                            </h3>
                            <button
                                onClick={resetForm}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-2">
                                        Coupon Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g., SAVE20"
                                        disabled={editingCoupon}
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-white disabled:opacity-50 text-sm font-medium transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 mb-2">
                                            Type *
                                        </label>
                                        <select
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-white text-sm font-medium transition-colors"
                                        >
                                            <option value="percentage">Percentage (%)</option>
                                            <option value="fixed">Fixed Amount (₹)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 mb-2">
                                            Value *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                                                {formData.discountType === 'percentage' ? '%' : '₹'}
                                            </span>
                                            <input
                                                type="number"
                                                value={formData.discountValue}
                                                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                                placeholder={formData.discountType === 'percentage' ? '20' : '100'}
                                                className="w-full px-4 py-3 pl-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-white text-sm font-medium transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 mb-2">
                                            Max Uses <span className="text-zinc-400 font-normal">(Opt)</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.maxUses}
                                            onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                                            placeholder="Unlimited"
                                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-white text-sm font-medium transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 mb-2">
                                            Expires *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.validUntil}
                                            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-white text-sm font-medium transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 mt-6">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-6 py-3 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition"
                                    >
                                        {submitting ? 'Saving...' : editingCoupon ? 'Update coupon' : 'Create coupon'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (Same as before) */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-800 transform transition scale-100">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 dark:text-red-400">
                                <FaExclamationTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                                Delete Coupon?
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                                Are you sure you want to delete <span className="font-semibold text-zinc-900 dark:text-white uppercase">"{couponToDelete?.code}"</span>? This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
                                >
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageCoupons;
