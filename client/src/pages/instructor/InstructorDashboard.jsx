import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FaPlus, FaRupeeSign, FaUsers, FaBook, FaChartLine,
    FaEdit, FaTag, FaEye, FaArrowRight, FaMoneyCheckAlt,
    FaCheckCircle, FaClock, FaCog
} from 'react-icons/fa';
import api from '../../api/axios';
import { showError } from '../../utils/toast';

const InstructorDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [dashboard, setDashboard] = useState({
        courses: [],
        totalCourses: 0,
        totalRevenue: 0,
        totalSales: 0,
        totalStudents: 0,
        recentPurchases: []
    });
    const [earnings, setEarnings] = useState(null);
    const [earningsLoading, setEarningsLoading] = useState(false);

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (activeTab === 'earnings' && !earnings) {
            fetchEarnings();
        }
    }, [activeTab]);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/instructor/dashboard');
            setDashboard(res.data);
        } catch (error) {
            showError('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchEarnings = async () => {
        setEarningsLoading(true);
        try {
            const res = await api.get('/instructor/earnings');
            setEarnings(res.data);
        } catch (error) {
            showError('Failed to load earnings');
        } finally {
            setEarningsLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return `₹${(amount || 0).toLocaleString('en-IN')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-zinc-200 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                            Instructor dashboard
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                            Courses, sales and payouts
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/instructor/payment-settings"
                            className="flex items-center gap-2 whitespace-nowrap px-3 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <FaCog className="text-xs" />
                            Payment settings
                        </Link>
                        <Link
                            to="/instructor/create-course"
                            className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        >
                            <FaPlus className="text-xs" />
                            Create course
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-800">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'courses', label: 'Courses' },
                        { id: 'earnings', label: 'Earnings' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard icon={FaRupeeSign} label="Revenue" value={formatCurrency(dashboard.totalRevenue)} color="green" />
                            <StatCard icon={FaChartLine} label="Sales" value={dashboard.totalSales} color="blue" />
                            <StatCard icon={FaUsers} label="Students" value={dashboard.totalStudents} color="purple" />
                            <StatCard icon={FaBook} label="Courses" value={dashboard.totalCourses} color="orange" />
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Courses */}
                            <div className="lg:col-span-2">
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                    <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                        <h2 className="font-medium text-zinc-900 dark:text-white">Your courses</h2>
                                        <button onClick={() => setActiveTab('courses')} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                                            View all <FaArrowRight className="text-[11px]" />
                                        </button>
                                    </div>
                                    {dashboard.courses.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <FaBook className="text-xl text-zinc-400" />
                                            </div>
                                            <h3 className="font-medium text-zinc-900 dark:text-white mb-1">No courses yet</h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Create your first course to start selling it</p>
                                            <Link
                                                to="/instructor/create-course"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                                            >
                                                <FaPlus /> Create course
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                                            {dashboard.courses.slice(0, 5).map(course => (
                                                <div key={course._id} className="px-5 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{course.title}</p>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                            <span className="flex items-center gap-1"><FaUsers className="text-[11px]" /> {course.enrollmentCount}</span>
                                                            <span>{formatCurrency(course.price)}</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                                                course.status === 'Published'
                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                                            }`}>{course.status}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => navigate(`/instructor/course/${course._id}/edit`)} className="p-2 text-zinc-400 hover:text-blue-500" title="Edit"><FaEdit className="text-sm" /></button>
                                                        <button onClick={() => navigate(`/marketplace/course/${course._id}`)} className="p-2 text-zinc-400 hover:text-blue-500" title="Preview"><FaEye className="text-sm" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Sales */}
                            <div>
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                    <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
                                        <h2 className="font-medium text-zinc-900 dark:text-white">Recent sales</h2>
                                    </div>
                                    {dashboard.recentPurchases.length === 0 ? (
                                        <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No sales yet</p>
                                    ) : (
                                        <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                                            {dashboard.recentPurchases.slice(0, 5).map(purchase => (
                                                <div key={purchase._id} className="px-5 py-3 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                                                        {purchase.user?.name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{purchase.user?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{purchase.course?.title}</p>
                                                    </div>
                                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">+{formatCurrency(purchase.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Courses Tab */}
                {activeTab === 'courses' && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        {dashboard.courses.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FaBook className="text-xl text-zinc-400" />
                                </div>
                                <h3 className="font-medium text-zinc-900 dark:text-white mb-1">No courses yet</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Start by creating your first course</p>
                                <Link to="/instructor/create-course" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                                    <FaPlus /> Create course
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                                {dashboard.courses.map(course => (
                                    <div key={course._id} className="p-5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-zinc-900 dark:text-white mb-1">{course.title}</h3>
                                            <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                <span className="flex items-center gap-1"><FaUsers className="text-xs" /> {course.enrollmentCount} students</span>
                                                <span>{formatCurrency(course.price)}</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    course.status === 'Published'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                                }`}>{course.status}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => navigate(`/instructor/course/${course._id}/edit`)} className="p-2 text-zinc-500 hover:text-blue-500 transition-colors" title="Edit"><FaEdit /></button>
                                            <button onClick={() => navigate(`/instructor/course/${course._id}/coupons`)} className="p-2 text-zinc-500 hover:text-green-500 transition-colors" title="Coupons"><FaTag /></button>
                                            <button onClick={() => navigate(`/marketplace/course/${course._id}`)} className="p-2 text-zinc-500 hover:text-blue-500 transition-colors" title="Preview"><FaEye /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Earnings Tab */}
                {activeTab === 'earnings' && (
                    <div>
                        {earningsLoading ? (
                            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">Loading earnings...</div>
                        ) : earnings ? (
                            <>
                                {/* Earnings Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Total earned</p>
                                        <p className="text-xl font-semibold text-zinc-900 dark:text-white mt-1">{formatCurrency(earnings.totalEarnings)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Paid out</p>
                                        <p className="text-xl font-semibold text-green-600 dark:text-green-400 mt-1">{formatCurrency(earnings.totalPaidOut)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Pending</p>
                                        <p className="text-xl font-semibold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(earnings.pendingAmount)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Total sales</p>
                                        <p className="text-xl font-semibold text-zinc-900 dark:text-white mt-1">{earnings.totalSales}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Monthly Earnings */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
                                            <h2 className="font-medium text-zinc-900 dark:text-white">Monthly earnings</h2>
                                        </div>
                                        {earnings.monthlyEarnings.length === 0 ? (
                                            <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No earnings data</p>
                                        ) : (
                                            <div className="p-5 space-y-3">
                                                {earnings.monthlyEarnings.map(m => {
                                                    const maxAmount = Math.max(...earnings.monthlyEarnings.map(e => e.total));
                                                    const width = maxAmount > 0 ? (m.total / maxAmount) * 100 : 0;
                                                    return (
                                                        <div key={m._id}>
                                                            <div className="flex items-center justify-between text-sm mb-1">
                                                                <span className="text-zinc-600 dark:text-zinc-400">{m._id}</span>
                                                                <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(m.total)} ({m.count} sales)</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full transition" style={{ width: `${width}%` }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Payout History */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
                                            <h2 className="font-medium text-zinc-900 dark:text-white">Payout history</h2>
                                        </div>
                                        {earnings.payouts.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <FaMoneyCheckAlt className="text-2xl text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400">No payouts yet</p>
                                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Payouts will appear here once the admin processes your payments</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                                                {earnings.payouts.map(p => (
                                                    <div key={p._id} className="px-5 py-3 flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                            p.status === 'completed'
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {p.status === 'completed' ? <FaCheckCircle className="text-sm" /> : <FaClock className="text-sm" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{formatCurrency(p.amount)}</p>
                                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                {p.method.replace('_', ' ')} &middot; {new Date(p.createdAt).toLocaleDateString()}
                                                                {p.transactionId && ` · ${p.transactionId}`}
                                                            </p>
                                                        </div>
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                            p.status === 'completed'
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                        }`}>{p.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ label, value }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-2 text-3xl font-medium text-zinc-900 dark:text-white leading-none tabular-nums">{value}</p>
    </div>
);

export default InstructorDashboard;
