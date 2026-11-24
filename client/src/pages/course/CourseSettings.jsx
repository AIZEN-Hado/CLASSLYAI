import { useState, useEffect } from 'react';
import TabLabel from '../../components/ui/TabLabel';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { FaArrowLeft, FaSave, FaPlus, FaTrash, FaPalette, FaStore, FaTag, FaTimes, FaTicketAlt, FaCog, FaChartBar, FaGift, FaBell, FaPaperPlane, FaExclamationTriangle, FaChevronDown } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';
import ManageCoupons from './ManageCoupons';

const CourseSettings = ({ isEmbedded = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const [course, setCourse] = useState(null);
    const [tagInput, setTagInput] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'Draft',
        lectureStatuses: [],
        completedStatus: 'Completed',
        allowPeerProgress: false,
        // Marketplace fields
        isMarketplace: false,
        price: 0,
        originalPrice: 0,
        currency: 'INR',
        category: '',
        level: '',
        tags: [],
        thumbnail: '',
        requirements: [],
        whatYouWillLearn: []
    });

    const categories = [
        'Web Development', 'Mobile Development', 'Data Science', 'Machine Learning',
        'Programming Languages', 'DevOps', 'Database', 'Security', 'Cloud Computing',
        'Design', 'Business', 'Marketing', 'Other'
    ];

    const levels = ['Beginner', 'Intermediate', 'Advanced'];

    const tabs = [
        { id: 'general', label: 'General', icon: FaCog },
        { id: 'marketplace', label: 'Marketplace', icon: FaStore },
        { id: 'coupons', label: 'Coupons', icon: FaTicketAlt },
        { id: 'progress', label: 'Progress Tracking', icon: FaChartBar },
        { id: 'notifications', label: 'Notifications', icon: FaBell }
    ];

    // Notification settings state
    const [notifSettings, setNotifSettings] = useState({
        newContent: false, newBroadcast: false, newQuiz: false,
        dueDateReminder: false, aiAccessChange: false, progressMilestone: false
    });
    const [notifLoaded, setNotifLoaded] = useState(false);
    const [notifSaving, setNotifSaving] = useState(false);

    useEffect(() => {
        if (id) {
            fetchCourse();
        }
    }, [id]);

    const fetchCourse = async () => {
        try {
            const res = await api.get(`/courses/${id}`);
            setCourse(res.data);
            setFormData({
                title: res.data.title,
                description: res.data.description,
                status: res.data.status || 'Draft',
                lectureStatuses: res.data.lectureStatuses && res.data.lectureStatuses.length > 0
                    ? res.data.lectureStatuses
                    : [
                        { label: 'Not Started', color: '#71717a' },
                        { label: 'In Progress', color: '#f59e0b' },
                        { label: 'Completed', color: '#10b981' }
                    ],
                completedStatus: res.data.completedStatus || 'Completed',
                allowPeerProgress: res.data.allowPeerProgress || false,
                isMarketplace: res.data.isMarketplace || false,
                price: res.data.price || 0,
                originalPrice: res.data.originalPrice || 0,
                currency: res.data.currency || 'INR',
                category: res.data.category || '',
                level: res.data.level || '',
                tags: res.data.tags || [],
                thumbnail: res.data.thumbnail || '',
                requirements: res.data.requirements || [],
                whatYouWillLearn: res.data.whatYouWillLearn || []
            });
            // Load notification settings
            if (res.data.notificationSettings) {
                setNotifSettings({
                    newContent: res.data.notificationSettings.newContent || false,
                    newBroadcast: res.data.notificationSettings.newBroadcast || false,
                    newQuiz: res.data.notificationSettings.newQuiz || false,
                    dueDateReminder: res.data.notificationSettings.dueDateReminder || false,
                    aiAccessChange: res.data.notificationSettings.aiAccessChange || false,
                    progressMilestone: res.data.notificationSettings.progressMilestone || false
                });
            }
            setNotifLoaded(true);
            setLoading(false);
        } catch (err) {
            showError('Failed to load course settings');
            navigate(`/admin/course/${id}`);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/courses/${id}`, { ...formData, notificationSettings: notifSettings });
            showSuccess('Settings saved successfully');
        } catch (error) {
            showError('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const addStatus = () => {
        setFormData({
            ...formData,
            lectureStatuses: [...formData.lectureStatuses, { label: '', color: '#52525b' }]
        });
    };

    const removeStatus = (index) => {
        const updated = formData.lectureStatuses.filter((_, i) => i !== index);
        setFormData({ ...formData, lectureStatuses: updated });
    };

    const updateStatus = (index, field, value) => {
        const updated = [...formData.lectureStatuses];
        updated[index][field] = value;
        setFormData({ ...formData, lectureStatuses: updated });
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
            setTagInput('');
        }
    };

    const removeTag = (tag) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    };

    const addRequirement = () => {
        setFormData({ ...formData, requirements: [...formData.requirements, ''] });
    };

    const updateRequirement = (index, value) => {
        const updated = [...formData.requirements];
        updated[index] = value;
        setFormData({ ...formData, requirements: updated });
    };

    const removeRequirement = (index) => {
        setFormData({ ...formData, requirements: formData.requirements.filter((_, i) => i !== index) });
    };

    const addLearning = () => {
        setFormData({ ...formData, whatYouWillLearn: [...formData.whatYouWillLearn, ''] });
    };

    const updateLearning = (index, value) => {
        const updated = [...formData.whatYouWillLearn];
        updated[index] = value;
        setFormData({ ...formData, whatYouWillLearn: updated });
    };

    const removeLearning = (index) => {
        setFormData({ ...formData, whatYouWillLearn: formData.whatYouWillLearn.filter((_, i) => i !== index) });
    };

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className={`bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white ${!isEmbedded ? 'min-h-screen pb-12' : ''}`}>
            {/* Header - Only Show if NOT embedded */}
            {!isEmbedded && (
                <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-navbar z-10">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <button
                            onClick={() => navigate(`/admin/course/${id}`)}
                            className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            <FaArrowLeft /> <span className="hidden sm:inline">Back to management</span>
                        </button>
                        <h1 className="text-lg font-semibold">Course settings</h1>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition active:scale-[0.98] disabled:opacity-50"
                        >
                            <FaSave /> {saving ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                </div>
            )}

            <div className={`container mx-auto max-w-5xl ${!isEmbedded ? 'px-4 py-8' : ''}`}>

                {/* Embedded Save Button Header */}
                {isEmbedded && (
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-white">Settings & Configuration</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage course details, marketplace listing, and coupons</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition active:scale-[0.98] disabled:opacity-50"
                        >
                            <FaSave /> {saving ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                    }`}
                            >
                                <tab.icon className="text-sm" />
                                <TabLabel active={activeTab === tab.id}>{tab.label}</TabLabel>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <>
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                                    <h2 className="text-sm font-semibold text-zinc-500">Course details</h2>
                                </div>
                                <div className="p-4 md:p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-400">Course title</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-400">Visibility status</label>
                                            <select
                                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="Draft">Draft</option>
                                                <option value="Published">Published</option>
                                                <option value="Archived">Archived</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-400">Description</label>
                                        <textarea
                                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[120px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-400">Thumbnail URL</label>
                                        <input
                                            type="url"
                                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.thumbnail}
                                            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                                            placeholder="https://example.com/thumbnail.jpg"
                                        />
                                        {formData.thumbnail && (
                                            <div className="mt-2">
                                                <img src={formData.thumbnail} alt="Thumbnail preview" className="h-32 rounded-lg object-cover" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Marketplace Tab */}
                    {activeTab === 'marketplace' && (
                        <div className="space-y-6">
                            {/* Main Listing Card */}
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                {/* Header with Toggle */}
                                <div className="px-4 md:px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold text-base text-zinc-800 dark:text-white flex items-center gap-2">
                                            <FaStore className="text-zinc-400" /> Marketplace listing
                                        </h3>
                                        <p className="text-sm text-zinc-500 mt-1">Manage your course pricing, category, and discovery settings.</p>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                            List on marketplace
                                        </span>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={formData.isMarketplace}
                                                onChange={(e) => setFormData({ ...formData, isMarketplace: e.target.checked })}
                                                className="sr-only"
                                            />
                                            <div className={`w-11 h-6 rounded-full transition-colors ${formData.isMarketplace ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${formData.isMarketplace ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                <div className="p-4 md:p-6 space-y-8">
                                    {/* Pricing Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-4">Pricing strategy</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Currency</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                                        value={formData.currency}
                                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                                    >
                                                        <option value="INR">₹ INR (Indian Rupee)</option>
                                                        <option value="USD">$ USD (US Dollar)</option>
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-xs"><FaChevronDown /></div>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Selling price</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">
                                                        {formData.currency === 'INR' ? '₹' : '$'}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={formData.price}
                                                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Original price <span className="text-[11px] font-normal opacity-70">(Strike-through)</span></label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium opacity-70">
                                                        {formData.currency === 'INR' ? '₹' : '$'}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-zinc-500"
                                                        value={formData.originalPrice}
                                                        onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {formData.originalPrice > formData.price && formData.price > 0 && (
                                            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-3 py-2 rounded-lg w-fit">
                                                <FaTag />
                                                <span className="font-medium">{Math.round((1 - formData.price / formData.originalPrice) * 100)}% Discount</span> will be displayed to students.
                                            </div>
                                        )}
                                    </div>

                                    {/* Category Section */}
                                    <div className="space-y-4 pt-2">
                                        <h4 className="text-sm font-semibold text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-4">Categorization</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Category</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                                        value={formData.category}
                                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    >
                                                        <option value="">Select Category</option>
                                                        {categories.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-xs"><FaChevronDown /></div>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Difficulty level</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                                        value={formData.level}
                                                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                                    >
                                                        <option value="">Select Level</option>
                                                        {levels.map(level => (
                                                            <option key={level} value={level}>{level}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-xs"><FaChevronDown /></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Search tags</label>
                                            <div className="flex bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
                                                <div className="flex flex-wrap gap-2 w-full">
                                                    {formData.tags.map((tag, i) => (
                                                        <span key={i} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-xs font-medium shadow-sm">
                                                            {tag}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTag(tag)}
                                                                className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <FaTimes size={10} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                    <input
                                                        type="text"
                                                        className="flex-1 min-w-[120px] bg-transparent text-sm p-1 focus:outline-none"
                                                        value={tagInput}
                                                        onChange={(e) => setTagInput(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                                        placeholder={formData.tags.length > 0 ? "Add another tag" : "Type keywords like 'React', 'Design'..."}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-zinc-400">Press Enter to add a tag. Helps students find your course.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info Card */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Requirements */}
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-full">
                                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex justify-between items-center">
                                        <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">Requirements</h3>
                                        <button type="button" onClick={addRequirement} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                                            + Add Item
                                        </button>
                                    </div>
                                    <div className="p-5 flex-1 space-y-3">
                                        {formData.requirements.length === 0 && (
                                            <div className="text-center py-8 opacity-50">
                                                <p className="text-xs">What should students know before joining?</p>
                                            </div>
                                        )}
                                        {formData.requirements.map((req, i) => (
                                            <div key={i} className="flex gap-2 group">
                                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-transparent border-b border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-blue-500 text-sm py-1 focus:outline-none transition-colors"
                                                    value={req}
                                                    onChange={(e) => updateRequirement(i, e.target.value)}
                                                    placeholder="Prerequisite"
                                                />
                                                <button type="button" onClick={() => removeRequirement(i)} className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <FaTimes size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* What You'll Learn */}
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-full">
                                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex justify-between items-center">
                                        <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">What You'll Learn</h3>
                                        <button type="button" onClick={addLearning} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded font-semibold hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
                                            + Add Item
                                        </button>
                                    </div>
                                    <div className="p-5 flex-1 space-y-3">
                                        {formData.whatYouWillLearn.length === 0 && (
                                            <div className="text-center py-8 opacity-50">
                                                <p className="text-xs">What skills will they gain?</p>
                                            </div>
                                        )}
                                        {formData.whatYouWillLearn.map((item, i) => (
                                            <div key={i} className="flex gap-2 group">
                                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-transparent border-b border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-green-500 text-sm py-1 focus:outline-none transition-colors"
                                                    value={item}
                                                    onChange={(e) => updateLearning(i, e.target.value)}
                                                    placeholder="Learning outcome"
                                                />
                                                <button type="button" onClick={() => removeLearning(i)} className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <FaTimes size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Coupons Tab */}
                    {activeTab === 'coupons' && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[500px]">
                            <ManageCoupons embeddedCourseId={id} />
                        </div>
                    )}

                    {/* Progress Tracking Tab */}
                    {activeTab === 'progress' && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                            <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                                <h2 className="text-base font-semibold text-zinc-800 dark:text-white">Progress tracking configuration</h2>
                                <p className="text-sm text-zinc-500 mt-0.5">Manage how student progress is tracked and displayed.</p>
                            </div>

                            <div className="p-4 md:p-6 space-y-8">
                                {/* Completion Status Section */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Completion logic</label>
                                    <p className="text-xs text-zinc-500 mb-2">Which status marks a lecture as fully complete?</p>
                                    <div className="max-w-md">
                                        <div className="relative">
                                            <select
                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none cursor-pointer"
                                                value={formData.completedStatus}
                                                onChange={(e) => setFormData({ ...formData, completedStatus: e.target.value })}
                                                required
                                            >
                                                <option value="">Select a status...</option>
                                                {formData.lectureStatuses.map((stat, i) => (
                                                    <option key={i} value={stat.label}>{stat.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-xs"><FaChevronDown /></div>
                                        </div>
                                        {!formData.lectureStatuses.find(s => s.label === formData.completedStatus) && formData.completedStatus && (
                                            <p className="text-xs text-amber-500 font-semibold mt-2 flex items-center gap-1">
                                                <FaExclamationTriangle /> Status "{formData.completedStatus}" no longer exists
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                                        <div>
                                            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Custom statuses</label>
                                            <p className="text-xs text-zinc-500 mt-1">Define the stages of progress for your lectures.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addStatus}
                                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition active:scale-[0.98]"
                                        >
                                            <FaPlus /> Add status
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.lectureStatuses.map((stat, index) => (
                                            <div key={index} className="flex items-center gap-2 sm:gap-3 group">
                                                <div className="relative flex-1">
                                                    <div
                                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden cursor-pointer transition-transform z-10"
                                                        style={{ backgroundColor: stat.color }}
                                                    >
                                                        <input
                                                            type="color"
                                                            value={stat.color}
                                                            onChange={(e) => updateStatus(index, 'color', e.target.value)}
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Status Label"
                                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-11 pr-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition focus:bg-white dark:focus:bg-zinc-900"
                                                        value={stat.label}
                                                        onChange={(e) => updateStatus(index, 'label', e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeStatus(index)}
                                                    className="p-3 text-zinc-400 bg-zinc-100 dark:bg-zinc-900 rounded-xl hover:bg-red-50 hover:text-red-500 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                                    title="Delete Status"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {formData.lectureStatuses.length === 0 && (
                                        <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                            <p className="text-sm text-zinc-400 font-medium">No statuses added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            {/* Auto Notification Triggers */}
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <FaBell className="text-zinc-400" /> Auto notification triggers
                                    </h2>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Choose which events automatically notify enrolled students</p>
                                </div>
                                <div className="p-4 md:p-6 space-y-1">
                                    {[
                                        { key: 'newContent', label: 'New Content', desc: 'When a section or lecture is added' },
                                        { key: 'newBroadcast', label: 'New Broadcast', desc: 'When a course announcement is posted' },
                                        { key: 'newQuiz', label: 'New Quiz', desc: 'When a quiz is published' },
                                        { key: 'dueDateReminder', label: 'Due Date Reminder', desc: 'Remind students 1 day before a due date' },
                                        { key: 'aiAccessChange', label: 'AI Access Changes', desc: 'When AI access is enabled, disabled, or a student is blocked' },
                                        { key: 'progressMilestone', label: 'Progress Milestones', desc: 'When a student reaches 25%, 50%, 75%, or 100%' }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <div>
                                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{item.label}</p>
                                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{item.desc}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }));
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${notifSettings[item.key] ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${notifSettings[item.key] ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Bottom Save Button for convenience */}
                    {isEmbedded && (
                        <div className="flex justify-end mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition active:scale-[0.98] disabled:opacity-50"
                            >
                                <FaSave /> {saving ? 'Saving...' : 'Save changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseSettings;
