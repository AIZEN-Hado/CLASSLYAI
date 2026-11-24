import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    FaArrowLeft,
    FaUserGraduate,
    FaCheckCircle,
    FaClock,
    FaPlayCircle,
    FaChevronDown,
    FaChevronRight,
    FaEnvelope,
    FaCalendarAlt
} from 'react-icons/fa';
import { showError } from '../../utils/toast';

const StudentProgressDetail = () => {
    const { courseId, studentId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await api.get(`/courses/${courseId}/progress/${studentId}`);
                setData(res.data);
                // Expand all sections by default
                const expanded = {};
                res.data.sections.forEach(section => {
                    expanded[section._id] = true;
                });
                setExpandedSections(expanded);
            } catch (err) {
                console.error(err);
                showError(err, 'Failed to load student progress');
            } finally {
                setLoading(false);
            }
        };
        fetchProgress();
    }, [courseId, studentId]);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const getStatusIcon = (status, lectureStatuses) => {
        const completedLabel = data?.course?.lectureStatuses?.find(s => s.label === (data?.course?.completedStatus || 'Completed'))?.label || 'Completed';
        const inProgressLabel = 'In Progress';

        if (status === completedLabel || status === 'Completed') {
            return <FaCheckCircle className="text-green-500" />;
        } else if (status === inProgressLabel || status === 'In Progress') {
            return <FaPlayCircle className="text-amber-500" />;
        }
        return <FaClock className="text-zinc-400" />;
    };

    const getStatusColor = (status) => {
        const statusConfig = data?.course?.lectureStatuses?.find(s => s.label === status);
        if (statusConfig) {
            return statusConfig.color;
        }
        // Defaults
        if (status === 'Completed') return '#10b981';
        if (status === 'In Progress') return '#f59e0b';
        return '#71717a';
    };

    const getStatusBadgeClasses = (status) => {
        const completedStatus = data?.course?.completedStatus || 'Completed';
        const statusConfig = data?.course?.lectureStatuses?.find(s => s.label === status);

        if (status === completedStatus) {
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        } else if (status === 'In Progress') {
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        } else if (status === 'Not Started') {
            return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
        }

        // For custom statuses, use color from config if available
        if (statusConfig?.color) {
            return 'bg-zinc-100 dark:bg-zinc-800';
        }
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    };

    const getStatusDateLabel = (status) => {
        const completedStatus = data?.course?.completedStatus || 'Completed';
        if (status === completedStatus) {
            return 'Completed on';
        } else if (status === 'In Progress') {
            return 'Started on';
        } else if (status === 'Not Started') {
            return null; // No date for not started
        }
        // For custom statuses
        return 'Updated on';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-zinc-500 dark:text-zinc-400">Loading student progress...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-zinc-500 dark:text-zinc-400">Failed to load data</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-12 transition-colors duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-navbar z-10 transition-colors">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Student progress</h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{data.course.title}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Student Info Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 text-2xl font-semibold">
                            {data.student.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                <FaUserGraduate className="text-zinc-400" />
                                {data.student.name}
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-1">
                                <FaEnvelope className="text-xs" />
                                {data.student.email}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-2 mt-1">
                                <FaCalendarAlt className="text-xs" />
                                Enrolled on {new Date(data.enrolledAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Overall Progress */}
                    <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Overall progress</span>
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                                {data.progress.completedLectures}/{data.progress.totalLectures} lectures ({data.progress.progressPercent}%)
                            </span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3">
                            <div
                                className="bg-blue-500 h-3 rounded-full transition duration-500"
                                style={{ width: `${data.progress.progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Sections and Lectures */}
                <div className="space-y-4">
                    {data.sections.map((section) => (
                        <div
                            key={section._id}
                            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
                        >
                            {/* Section Header */}
                            <button
                                onClick={() => toggleSection(section._id)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedSections[section._id] ? (
                                        <FaChevronDown className="text-zinc-400 text-sm" />
                                    ) : (
                                        <FaChevronRight className="text-zinc-400 text-sm" />
                                    )}
                                    <div className="text-left">
                                        <h3 className="font-medium text-zinc-900 dark:text-white">
                                            Section {section.sectionNumber}: {section.title}
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            {section.completedCount}/{section.totalCount} completed
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition"
                                            style={{ width: `${section.progressPercent}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 w-12 text-right">
                                        {section.progressPercent}%
                                    </span>
                                </div>
                            </button>

                            {/* Lectures List */}
                            {expandedSections[section._id] && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800">
                                    {section.lectures.length > 0 ? (
                                        [...section.lectures].sort((a, b) => a.number - b.number).map((lecture, idx) => (
                                            <div
                                                key={lecture._id}
                                                className="px-6 py-3 flex items-center justify-between border-b border-zinc-50 dark:border-zinc-800/50 last:border-b-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(lecture.status)}
                                                    <div>
                                                        <p className="text-sm text-zinc-800 dark:text-zinc-200">
                                                            <span className="text-zinc-400 dark:text-zinc-500 mr-2">
                                                                {lecture.number || idx + 1}.
                                                            </span>
                                                            {lecture.title}
                                                        </p>
                                                        {lecture.statusDate && lecture.status !== 'Not Started' && getStatusDateLabel(lecture.status) && (
                                                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                                                {getStatusDateLabel(lecture.status)} {new Date(lecture.statusDate).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`text-xs px-2.5 py-1 rounded-md font-medium ${getStatusBadgeClasses(lecture.status)}`}
                                                    style={getStatusColor(lecture.status) ? {
                                                        backgroundColor: `${getStatusColor(lecture.status)}20`,
                                                        color: getStatusColor(lecture.status)
                                                    } : {}}
                                                >
                                                    {lecture.status}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-6 py-4 text-sm text-zinc-400 dark:text-zinc-500 italic">
                                            No lectures in this section
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {data.sections.length === 0 && (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 text-center">
                            <p className="text-zinc-500 dark:text-zinc-400">No sections in this course yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentProgressDetail;
