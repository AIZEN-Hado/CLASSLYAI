import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { FaArrowLeft, FaUsers, FaCheckCircle, FaClock, FaPercentage, FaTrophy } from 'react-icons/fa';

const QuizAnalytics = () => {
    const { courseId, quizId } = useParams();
    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [quizId]);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get(`/quizzes/${quizId}/analytics`);
            setAnalytics(res.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <p className="text-zinc-500">Failed to load analytics</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-12 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/admin/course/${courseId}/quizzes`)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Quiz analytics</h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{analytics.quizTitle}</p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                            <FaUsers size={14} />
                            <span className="text-xs font-medium">Students</span>
                        </div>
                        <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{analytics.overview.uniqueStudents}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                            <FaCheckCircle size={14} />
                            <span className="text-xs font-medium">Pass rate</span>
                        </div>
                        <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{analytics.overview.passRate}%</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                            <FaPercentage size={14} />
                            <span className="text-xs font-medium">Avg score</span>
                        </div>
                        <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{analytics.overview.avgScore}%</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                            <FaClock size={14} />
                            <span className="text-xs font-medium">Avg time</span>
                        </div>
                        <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{formatTime(analytics.overview.avgTimeTaken)}</p>
                    </div>
                </div>

                {/* Question Stats */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h2 className="font-medium text-zinc-900 dark:text-white">Question performance</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">How students performed on each question</p>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {analytics.questionStats.map((q, idx) => (
                            <div key={idx} className="p-4 flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-zinc-900 dark:text-white truncate">{q.questionText}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {q.correctCount} of {q.totalAnswers} correct
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-lg font-semibold ${
                                        q.correctRate >= 70 ? 'text-green-600 dark:text-green-400' :
                                        q.correctRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-red-600 dark:text-red-400'
                                    }`}>
                                        {q.correctRate}%
                                    </p>
                                </div>
                            </div>
                        ))}
                        {analytics.questionStats.length === 0 && (
                            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                                No question data available yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h2 className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                            <FaTrophy className="text-amber-500" />
                            Top performers
                        </h2>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {analytics.topPerformers.map((p, idx) => (
                            <div key={idx} className="p-4 flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${
                                    idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                    idx === 1 ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300' :
                                    idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{p.student.name}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.student.email}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-lg font-semibold ${p.passed ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        {p.percentage}%
                                    </p>
                                    <p className="text-xs text-zinc-500">{formatTime(p.timeTaken)}</p>
                                </div>
                            </div>
                        ))}
                        {analytics.topPerformers.length === 0 && (
                            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                                No attempts yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizAnalytics;