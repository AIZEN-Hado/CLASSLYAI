import { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { Link, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { FaBook, FaCheckCircle, FaPlus, FaCog, FaUsers, FaEye, FaEyeSlash, FaTrash, FaGraduationCap, FaChalkboardTeacher, FaRobot, FaArrowRight } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';

const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const { setCounts } = useOutletContext() || {};

    // Tab comes from the route; the tab bar lives in LearnTabs
    const activeTab = location.pathname === '/my-courses' ? 'created' : 'enrolled';
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [createdCourses, setCreatedCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [newCourse, setNewCourse] = useState({ title: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!loading) setCounts?.({ enrolled: enrolledCourses.length, created: createdCourses.length });
    }, [loading, enrolledCourses.length, createdCourses.length, setCounts]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [enrolledRes, createdRes] = await Promise.all([
                    api.get('/courses/my/enrolled'),
                    api.get('/courses/my/created')
                ]);
                setEnrolledCourses(enrolledRes.data);
                setCreatedCourses(createdRes.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        if (!newCourse.title.trim() || !newCourse.description.trim()) {
            showError('Please fill all fields');
            return;
        }

        setCreating(true);
        try {
            const res = await api.post('/courses', newCourse);
            setCreatedCourses([res.data, ...createdCourses]);
            setShowCreateModal(false);
            setNewCourse({ title: '', description: '' });
            showSuccess('Course created successfully');
            navigate(`/admin/course/${res.data._id}`);
        } catch (error) {
            showError(error, 'Failed to create course');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;

        setDeleting(true);
        try {
            await api.delete(`/courses/${courseToDelete._id}`);
            setCreatedCourses(createdCourses.filter(c => c._id !== courseToDelete._id));
            setShowDeleteModal(false);
            setCourseToDelete(null);
            showSuccess('Course deleted successfully');
        } catch (error) {
            showError(error, 'Failed to delete course');
        } finally {
            setDeleting(false);
        }
    };

    const openDeleteModal = (course) => {
        setCourseToDelete(course);
        setShowDeleteModal(true);
    };

    if (loading) return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-12">
            <div className="container mx-auto px-4 py-6 sm:py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-12">
            <div key={activeTab} className="container mx-auto px-4 py-6 sm:py-8 motion-safe:animate-fade-in">
                {/* AI Chat Banner */}
                {activeTab === 'enrolled' && (
                    <Link to="/ai-chat" className="block mb-6 group">
                        <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl p-5 transition-colors">
                            <div className="relative flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 text-zinc-500 dark:text-zinc-400">
                                        <FaRobot className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-medium text-zinc-900 dark:text-white">Study assistant</h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Ask about a lecture, or upload a PDF or image to discuss</p>
                                    </div>
                                </div>
                                <FaArrowRight className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0 hidden sm:block" />
                            </div>
                        </div>
                    </Link>
                )}

                {activeTab === 'enrolled' ? (
                    // Enrolled Courses Tab
                    enrolledCourses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {enrolledCourses.map(item => {
                                const completionLabel = item.course.completedStatus || 'Completed';
                                const completedCount = item.completedLectures ? item.completedLectures.filter(l => l.status === completionLabel).length : 0;

                                // Use pre-computed totalLectures from optimized API
                                const totalLectures = item.course.totalLectures ?? 0;
                                const percent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

                                return (
                                    <Link
                                        key={item._id}
                                        to={`/course/${item.course._id}`}
                                        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col overflow-hidden group"
                                    >
                                        {/* Card Header - Thumbnail */}
                                        <div className="h-28 sm:h-32 bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                                            {item.course.thumbnail ? (
                                                <img src={item.course.thumbnail} alt={item.course.title} className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_15px,rgba(0,0,0,0.05)_15px,rgba(0,0,0,0.05)_16px)] dark:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_15px,rgba(255,255,255,0.05)_15px,rgba(255,255,255,0.05)_16px)]"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <FaGraduationCap className="text-zinc-300 dark:text-zinc-600 text-4xl" />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                            <h2 className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white leading-tight mb-2 line-clamp-2">
                                                {item.course.title}
                                            </h2>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">
                                                {item.course.description || "No description"}
                                            </p>

                                            {/* Progress Info */}
                                            <div className="mt-auto">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                                                        {completedCount} of {totalLectures} lectures
                                                    </span>
                                                    <span className={`text-xs font-medium ${percent === 100 ? 'text-green-600 dark:text-green-400' : 'text-zinc-900 dark:text-zinc-100'} tabular-nums`}>
                                                        {percent === 100 ? (
                                                            <span className="flex items-center gap-1">
                                                                <FaCheckCircle className="text-[11px]" /> Complete
                                                            </span>
                                                        ) : (
                                                            `${percent}%`
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-1.5 rounded-full ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 sm:py-20 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
                            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <FaGraduationCap className="text-zinc-400 dark:text-zinc-500 text-3xl" />
                            </div>
                            <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                                No courses yet
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                                Courses an instructor enrolls you in will appear here
                            </p>
                        </div>
                    )
                ) : (
                    // Created Courses Tab
                    <div>
                        {/* Header with Create Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {createdCourses.length > 0
                                        ? `You have ${createdCourses.length} course${createdCourses.length > 1 ? 's' : ''}`
                                        : 'Start creating your first course'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg text-sm flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
                            >
                                <FaPlus className="text-xs" /> New course
                            </button>
                        </div>

                        {createdCourses.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                {createdCourses.map(course => {
                                    // Use pre-computed totalLectures from optimized API
                                    const totalLectures = course.totalLectures ?? 0;
                                    const studentCount = course.studentCount ?? 0;

                                    return (
                                        <div key={course._id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden group">
                                            {/* Card Header */}
                                            <div className="h-28 sm:h-32 bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                                                {course.thumbnail ? (
                                                    <img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_15px,rgba(0,0,0,0.05)_15px,rgba(0,0,0,0.05)_16px)] dark:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_15px,rgba(255,255,255,0.05)_15px,rgba(255,255,255,0.05)_16px)]"></div>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <FaChalkboardTeacher className="text-zinc-300 dark:text-zinc-600 text-4xl" />
                                                        </div>
                                                    </>
                                                )}

                                                {/* Status Badge */}
                                                <div className="absolute top-3 right-3">
                                                    <span className={`text-white text-[11px] font-medium px-2 py-1 rounded-md bg-zinc-900/70 ${course.status === 'Published' ? 'text-green-300' :
                                                        course.status === 'Archived' ? 'text-red-300' : 'text-amber-300'
                                                        }`}>
                                                        {course.status === 'Published' ? (
                                                            <span className="flex items-center gap-1">
                                                                <FaEye className="text-[11px]" /> Live
                                                            </span>
                                                        ) : course.status === 'Archived' ? (
                                                            <span className="flex items-center gap-1">
                                                                <FaEyeSlash className="text-[11px]" /> Archived
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1">
                                                                <FaEyeSlash className="text-[11px]" /> Draft
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                                <h2 className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white leading-tight mb-2 line-clamp-2 transition-colors">
                                                    {course.title}
                                                </h2>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">
                                                    {course.description || "No description"}
                                                </p>

                                                {/* Stats */}
                                                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mb-4 flex-wrap">
                                                    <span className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded">
                                                        <FaBook className="text-zinc-400 text-[11px]" />
                                                        {totalLectures} lectures
                                                    </span>
                                                    <span className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded">
                                                        <FaUsers className="text-zinc-400 text-[11px]" />
                                                        {studentCount} students
                                                    </span>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 mt-auto">
                                                    <Link
                                                        to={`/admin/course/${course._id}`}
                                                        className="flex-1 bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-600 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <FaCog className="text-xs" /> Manage
                                                    </Link>
                                                    <Link
                                                        to={`/admin/course/${course._id}?tab=students`}
                                                        className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium py-2.5 px-3 rounded-lg text-sm flex items-center justify-center transition-colors"
                                                        title="View students"
                                                    >
                                                        <FaUsers />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            openDeleteModal(course);
                                                        }}
                                                        className="bg-zinc-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-900/20 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 font-medium py-2.5 px-3 rounded-lg text-sm flex items-center justify-center transition-colors"
                                                        title="Delete course"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16 sm:py-20 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
                                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                    <FaChalkboardTeacher className="text-zinc-400 dark:text-zinc-500 text-3xl" />
                                </div>
                                <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                                    No courses created yet
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
                                    Courses you create will appear here, with their lectures and students
                                </p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm inline-flex items-center gap-2 transition-colors"
                                >
                                    <FaPlus className="text-xs" /> Create a course
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Course Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                                <FaPlus className="text-blue-600 dark:text-zinc-400 text-lg" />
                            </div>
                            <h2 className="text-xl font-medium text-zinc-900 dark:text-white">Create new course</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Fill in the details to create your course</p>
                        </div>
                        <form onSubmit={handleCreateCourse} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Course title
                                </label>
                                <input
                                    type="text"
                                    value={newCourse.title}
                                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-zinc-800 transition outline-none"
                                    placeholder="e.g., Introduction to Web Development"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-zinc-800 transition resize-none outline-none"
                                    placeholder="Describe what students will learn"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setNewCourse({ title: '', description: '' });
                                    }}
                                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium py-3 rounded-xl text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-colors shadow-sm"
                                >
                                    {creating ? 'Creating...' : 'Create course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Course Modal */}
            {showDeleteModal && courseToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
                                <FaTrash className="text-red-600 dark:text-red-400 text-lg" />
                            </div>
                            <h2 className="text-xl font-medium text-zinc-900 dark:text-white mb-2">Delete course</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                Are you sure you want to delete <span className="font-medium text-zinc-700 dark:text-zinc-200">"{courseToDelete.title}"</span>?
                            </p>
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4 mb-6">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    This action cannot be undone. All lectures, sections, and enrolled student progress will be permanently deleted.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setCourseToDelete(null);
                                    }}
                                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium py-3 rounded-xl text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteCourse}
                                    disabled={deleting}
                                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-colors shadow-sm"
                                >
                                    {deleting ? 'Deleting...' : 'Delete course'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
