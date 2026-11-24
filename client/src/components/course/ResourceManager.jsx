import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { FaUpload, FaTrash, FaDownload, FaFilePdf, FaImage, FaFileAlt, FaLink, FaToggleOn, FaToggleOff, FaTimes, FaCloudUploadAlt, FaUserGraduate, FaChalkboardTeacher, FaEye, FaPaperclip, FaBook, FaEdit } from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';

const FILE_TYPE_ICONS = {
    pdf: FaFilePdf,
    image: FaImage,
    document: FaFileAlt,
    link: FaLink,
};

const FILE_TYPE_COLORS = {
    pdf: 'text-red-500',
    image: 'text-blue-500',
    document: 'text-amber-500',
    link: 'text-blue-500',
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const ResourceManager = ({ courseId, isTeacher = false, userId = null, sections = [] }) => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [allowStudentUploads, setAllowStudentUploads] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [filter, setFilter] = useState('all'); // all, teacher, student
    const [isTeacherUser, setIsTeacherUser] = useState(false);
    const fileInputRef = useRef(null);

    // Upload form state
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadDesc, setUploadDesc] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadUrl, setUploadUrl] = useState('');
    const [uploadMode, setUploadMode] = useState('file'); // file or link

    // Edit state
    const [editingResourceId, setEditingResourceId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');

    // Linking state
    const [linkedType, setLinkedType] = useState('course');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedLectureId, setSelectedLectureId] = useState('');

    // Viewer modal state
    const [viewingResource, setViewingResource] = useState(null);
    const [viewTextContent, setViewTextContent] = useState(null);
    const [viewUrl, setViewUrl] = useState(null);

    // Build flat lectures for selected section
    const selectedSection = sections.find(s => s._id === selectedSectionId);
    const lecturesForSection = selectedSection?.lectures || [];

    // Build a lookup map for section/lecture names
    const sectionMap = {};
    const lectureMap = {};
    sections.forEach(s => {
        sectionMap[s._id] = s.title;
        (s.lectures || []).forEach(l => {
            lectureMap[l._id] = l.title;
        });
    });

    const fetchResources = async () => {
        try {
            const res = await api.get(`/resources/${courseId}`);
            setResources(res.data.resources);
            setAllowStudentUploads(res.data.allowStudentUploads);
            setIsTeacherUser(res.data.isTeacher);
        } catch (err) {
            showError('Failed to load resources');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [courseId]);

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            // Build linking data
            const linkData = {};
            if (linkedType !== 'course') {
                linkData.linkedType = linkedType;
                if (selectedSectionId) linkData.sectionId = selectedSectionId;
                if (linkedType === 'lecture' && selectedLectureId) linkData.lectureId = selectedLectureId;
            }

            if (uploadMode === 'link') {
                if (!uploadUrl.trim()) {
                    showError('Please enter a URL');
                    setUploading(false);
                    return;
                }
                await api.post(`/resources/${courseId}`, {
                    title: uploadTitle || uploadUrl,
                    description: uploadDesc,
                    url: uploadUrl,
                    ...linkData
                });
            } else {
                if (!uploadFile) {
                    showError('Please select a file');
                    setUploading(false);
                    return;
                }
                const formData = new FormData();
                formData.append('file', uploadFile);
                if (uploadTitle) formData.append('title', uploadTitle);
                if (uploadDesc) formData.append('description', uploadDesc);
                if (linkData.linkedType) formData.append('linkedType', linkData.linkedType);
                if (linkData.sectionId) formData.append('sectionId', linkData.sectionId);
                if (linkData.lectureId) formData.append('lectureId', linkData.lectureId);

                await api.post(`/resources/${courseId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            showSuccess('Resource uploaded');
            resetForm();
            fetchResources();
        } catch (err) {
            showError(err, 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (resourceId) => {
        if (!confirm('Delete this resource?')) return;
        try {
            await api.delete(`/resources/${courseId}/${resourceId}`);
            setResources(prev => prev.filter(r => r._id !== resourceId));
            showSuccess('Resource deleted');
        } catch (err) {
            showError('Failed to delete resource');
        }
    };

    const handleSaveEdit = async (resourceId) => {
        try {
            const res = await api.put(`/resources/${courseId}/${resourceId}`, {
                title: editTitle,
                description: editDesc
            });
            setResources(prev => prev.map(r => r._id === resourceId ? res.data.resource : r));
            setEditingResourceId(null);
            showSuccess('Resource updated');
        } catch (err) {
            showError(err, 'Update failed');
        }
    };

    const handleToggleStudentUploads = async () => {
        try {
            const res = await api.put(`/resources/${courseId}/toggle-student-uploads`);
            setAllowStudentUploads(res.data.allowStudentUploads);
            showSuccess(res.data.allowStudentUploads ? 'Student uploads enabled' : 'Student uploads disabled');
        } catch (err) {
            showError('Failed to toggle setting');
        }
    };

    const handleDownload = async (resource) => {
        if (resource.fileType === 'link') {
            window.open(resource.url, '_blank');
            return;
        }
        try {
            const res = await api.get(`/resources/${courseId}/${resource._id}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', resource.fileName || 'download');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showError('Download failed');
        }
    };

    const handleView = async (resource) => {
        if (resource.fileType === 'link') {
            window.open(resource.url, '_blank');
            return;
        }
        try {
            const res = await api.get(`/resources/${courseId}/${resource._id}/view`, {
                responseType: 'blob'
            });
            const blob = new Blob([res.data], { type: resource.mimeType });
            
            if (resource.mimeType?.includes('csv') || resource.mimeType?.includes('text') || resource.mimeType?.includes('txt')) {
                const text = await blob.text();
                setViewTextContent(text);
            } else {
                setViewTextContent(null);
            }

            const blobUrl = window.URL.createObjectURL(blob);
            setViewUrl(blobUrl);
            setViewingResource(resource);
        } catch (err) {
            showError('Failed to load resource for viewing');
        }
    };

    const closeViewer = () => {
        if (viewUrl) window.URL.revokeObjectURL(viewUrl);
        setViewUrl(null);
        setViewingResource(null);
        setViewTextContent(null);
    };

    const resetForm = () => {
        setShowUploadForm(false);
        setUploadTitle('');
        setUploadDesc('');
        setUploadFile(null);
        setUploadUrl('');
        setUploadMode('file');
        setLinkedType('course');
        setSelectedSectionId('');
        setSelectedLectureId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const canUpload = isTeacherUser || allowStudentUploads;

    const filteredResources = resources.filter(r => {
        if (filter === 'teacher') return r.uploaderRole === 'teacher';
        if (filter === 'student') return r.uploaderRole === 'student';
        return true;
    });

    // Get link label for a resource
    const getLinkLabel = (resource) => {
        if (!resource.linkedType || resource.linkedType === 'course') return null;
        if (resource.linkedType === 'lecture' && resource.lectureId) {
            const name = lectureMap[resource.lectureId] || lectureMap[resource.lectureId?._id];
            return { type: 'Lecture', name: name || 'Lecture' };
        }
        if (resource.linkedType === 'section' && resource.sectionId) {
            const name = sectionMap[resource.sectionId];
            return { type: 'Section', name: name || 'Section' };
        }
        return null;
    };

    if (loading) {
        return (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-zinc-500">Loading Resources...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Viewer Modal */}
            {viewingResource && viewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeViewer}>
                    <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-zinc-800 dark:text-white truncate">{viewingResource.title}</h3>
                                {viewingResource.description && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{viewingResource.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                                <button
                                    onClick={() => handleDownload(viewingResource)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                                >
                                    <FaDownload size={10} /> Download
                                </button>
                                <button onClick={closeViewer} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                                    <FaTimes size={14} />
                                </button>
                            </div>
                        </div>
                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-1 bg-zinc-100 dark:bg-zinc-950" style={{ minHeight: '400px' }}>
                            {viewingResource.fileType === 'pdf' ? (
                                <iframe src={viewUrl} className="w-full h-full min-h-[70vh] rounded-lg" title={viewingResource.title} />
                            ) : viewingResource.fileType === 'image' ? (
                                <div className="flex items-center justify-center p-4 h-full">
                                    <img src={viewUrl} alt={viewingResource.title} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" />
                                </div>
                            ) : viewingResource.mimeType?.includes('csv') && viewTextContent ? (
                                <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-lg overflow-x-auto shadow-inner min-h-[70vh]">
                                    <table className="w-full text-left border-collapse min-w-max text-xs md:text-sm">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 shadow-sm">
                                            <tr>
                                                {viewTextContent.split('\n')[0]?.split(',').map((header, i) => (
                                                    <th key={i} className="border-b dark:border-zinc-700 px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                        {header.replace(/^"|"$/g, '')}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                            {viewTextContent.split('\n').slice(1).map((line, i) => line.trim() ? (
                                                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                                    {line.split(',').map((cell, j) => (
                                                        <td key={j} className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                                                            {cell.replace(/^"|"$/g, '')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ) : null)}
                                        </tbody>
                                    </table>
                                </div>
                            ) : viewingResource.mimeType?.includes('text') && viewTextContent ? (
                                <div className="w-full h-full bg-white dark:bg-zinc-900 p-6 rounded-lg overflow-auto shadow-inner min-h-[70vh]">
                                    <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                                        {viewTextContent}
                                    </pre>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-20 gap-4 min-h-[70vh]">
                                    <FaFileAlt className="text-zinc-300 dark:text-zinc-700" size={56} />
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Preview not available for this format.</p>
                                    <button
                                        onClick={() => handleDownload(viewingResource)}
                                        className="flex items-center gap-2 px-6 py-2.5 mt-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-md transition"
                                    >
                                        <FaDownload size={12} /> Download to view
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-white">Resources</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {resources.length} resource{resources.length !== 1 ? 's' : ''} shared
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Teacher: toggle student uploads */}
                    {isTeacherUser && (
                        <button
                            onClick={handleToggleStudentUploads}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${allowStudentUploads
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                                }`}
                            title={allowStudentUploads ? 'Student uploads enabled' : 'Student uploads disabled'}
                        >
                            {allowStudentUploads ? <FaToggleOn size={16} /> : <FaToggleOff size={16} />}
                            Student uploads
                        </button>
                    )}

                    {canUpload && (
                        <button
                            onClick={() => setShowUploadForm(!showUploadForm)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-md transition"
                        >
                            <FaUpload size={11} /> Upload
                        </button>
                    )}
                </div>
            </div>

            {/* Upload Form */}
            {showUploadForm && canUpload && (
                <form onSubmit={handleUpload} className="border border-zinc-200 dark:border-zinc-700/80 rounded-xl overflow-hidden">
                    {/* Compact header with mode toggle */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700/80">
                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-700/50 rounded-md p-0.5">
                            <button
                                type="button"
                                onClick={() => setUploadMode('file')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition ${uploadMode === 'file'
                                    ? 'bg-zinc-900 dark:bg-zinc-500 text-white shadow-sm'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                    }`}
                            >
                                <FaCloudUploadAlt size={11} /> File
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadMode('link')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition ${uploadMode === 'link'
                                    ? 'bg-zinc-900 dark:bg-zinc-500 text-white shadow-sm'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                    }`}
                            >
                                <FaLink size={9} /> Link
                            </button>
                        </div>
                        <button type="button" onClick={resetForm} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded transition-colors">
                            <FaTimes size={11} />
                        </button>
                    </div>

                    {/* Form body */}
                    <div className="px-4 py-4 space-y-4 bg-white dark:bg-zinc-900/40">
                        {/* Title & Description row */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Title (optional)"
                                value={uploadTitle}
                                onChange={(e) => setUploadTitle(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700/80 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                            <input
                                type="text"
                                placeholder="Description (optional)"
                                value={uploadDesc}
                                onChange={(e) => setUploadDesc(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700/80 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>

                        {/* Link To selector - only show when sections are available */}
                        {sections.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/60">
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <FaPaperclip size={12} className="text-zinc-400" />
                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Link to:</span>
                                </div>
                                <select
                                    value={linkedType}
                                    onChange={(e) => { setLinkedType(e.target.value); setSelectedSectionId(''); setSelectedLectureId(''); }}
                                    className="px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition cursor-pointer"
                                >
                                    <option value="course">Entire Course</option>
                                    <option value="section">Specific Section</option>
                                    <option value="lecture">Specific Lecture</option>
                                </select>

                                {(linkedType === 'section' || linkedType === 'lecture') && (
                                    <select
                                        value={selectedSectionId}
                                        onChange={(e) => { setSelectedSectionId(e.target.value); setSelectedLectureId(''); }}
                                        className="px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition cursor-pointer min-w-[140px]"
                                    >
                                        <option value="">Select Section...</option>
                                        {sections.map(s => (
                                            <option key={s._id} value={s._id}>{s.title}</option>
                                        ))}
                                    </select>
                                )}

                                {linkedType === 'lecture' && selectedSectionId && lecturesForSection.length > 0 && (
                                    <select
                                        value={selectedLectureId}
                                        onChange={(e) => setSelectedLectureId(e.target.value)}
                                        className="px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition cursor-pointer min-w-[140px]"
                                    >
                                        <option value="">Select Lecture...</option>
                                        {lecturesForSection.map(l => (
                                            <option key={l._id} value={l._id}>{l.title}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* File/Link Input & Submit */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                                {uploadMode === 'file' ? (
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={(e) => setUploadFile(e.target.files[0])}
                                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.ppt,.pptx,.txt,.csv,.xls,.xlsx"
                                        className="w-full text-sm text-zinc-600 dark:text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-500/20 file:cursor-pointer cursor-pointer transition border border-zinc-200 dark:border-zinc-700/80 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500"
                                    />
                                ) : (
                                    <input
                                        type="url"
                                        placeholder="Enter secure URL (https://...)"
                                        value={uploadUrl}
                                        onChange={(e) => setUploadUrl(e.target.value)}
                                        className="w-full px-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700/80 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                    />
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-md transition disabled:opacity-50 shrink-0 w-full sm:w-auto"
                            >
                                {uploading ? 'Uploading...' : 'Upload resource'}
                            </button>
                        </div>
                        
                        {uploadMode === 'file' && (
                            <div className="flex items-start gap-2 text-zinc-400 dark:text-zinc-500">
                                <FaFileAlt className="mt-0.5 shrink-0 text-[11px]" />
                                <p className="text-[11px] leading-tight">
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Supported formats (max 10MB):</span> PDF, Document, Spreadsheet, Presentation, Image, Text
                                </p>
                            </div>
                        )}
                    </div>
                </form>
            )}

            {/* Filter Tabs */}
            {resources.some(r => r.uploaderRole === 'student') && (
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'teacher', label: 'Teacher', icon: FaChalkboardTeacher },
                        { id: 'student', label: 'Student', icon: FaUserGraduate },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f.id
                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                }`}
                        >
                            {f.icon && <f.icon size={10} />}
                            {f.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Resource List */}
            {filteredResources.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <FaFileAlt className="text-zinc-400 dark:text-blue-500/80" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-white mb-2">No resources yet</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                        {canUpload ? 'Upload notes, images, or share links to help your classmates.' : 'Study materials shared by the instructor will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredResources.map((resource) => {
                        const Icon = FILE_TYPE_ICONS[resource.fileType] || FaFileAlt;
                        const iconColor = FILE_TYPE_COLORS[resource.fileType] || 'text-zinc-500';
                        const linkLabel = getLinkLabel(resource);
                        const canView = resource.fileType === 'pdf' || resource.fileType === 'image' || resource.mimeType?.includes('csv') || resource.mimeType?.includes('text') || resource.mimeType?.includes('txt');

                        return (
                            <div
                                key={resource._id}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-start gap-3 group transition"
                            >
                                {/* File Icon */}
                                <div className={`w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 ${iconColor}`}>
                                    <Icon size={18} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    {editingResourceId === resource._id ? (
                                        <div className="space-y-3 pr-2 w-full pt-1">
                                            <div className="flex flex-col md:flex-row gap-3 md:items-start">
                                                <div className="flex-1 space-y-2">
                                                    <input 
                                                        type="text" 
                                                        value={editTitle}
                                                        onChange={e => setEditTitle(e.target.value)}
                                                        placeholder="Resource Title"
                                                        className="w-full px-3 py-1.5 text-sm font-medium border-b-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition"
                                                        autoFocus
                                                    />
                                                    <textarea 
                                                        value={editDesc}
                                                        onChange={e => setEditDesc(e.target.value)}
                                                        placeholder="Add a description (optional)"
                                                        rows={2}
                                                        className="w-full px-3 py-2 text-xs border border-zinc-200 dark:border-zinc-700/80 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition"
                                                    />
                                                </div>
                                                <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-24 justify-end md:justify-start md:pt-1 pl-3 md:pl-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 pt-3">
                                                    <button onClick={() => handleSaveEdit(resource._id)} className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium rounded-lg shadow-sm transition text-center">Save</button>
                                                    <button onClick={() => setEditingResourceId(null)} className="flex-1 md:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[11px] font-semibold rounded-lg transition-colors text-center border border-transparent dark:border-zinc-700/50">Cancel</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-sm font-medium text-zinc-800 dark:text-white truncate">{resource.title || resource.fileName}</h4>
                                                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${resource.uploaderRole === 'teacher'
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                    }`}>
                                                    {resource.uploaderRole}
                                                </span>
                                                {/* Link badge */}
                                                {linkLabel && (
                                                    <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shrink-0">
                                                        <FaPaperclip size={7} /> {linkLabel.type}: {linkLabel.name}
                                                    </span>
                                                )}
                                            </div>
                                            {resource.description && (
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-[80vw] whitespace-pre-wrap">{resource.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                                                <span>{resource.uploadedBy?.name || 'Unknown'}</span>
                                                <span>{new Date(resource.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                {resource.fileSize && <span>{formatFileSize(resource.fileSize)}</span>}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* View button (for PDFs and images) */}
                                    {canView && (
                                        <button
                                            onClick={() => handleView(resource)}
                                            className="p-2 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                            title="View"
                                        >
                                            <FaEye size={12} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDownload(resource)}
                                        className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                        title={resource.fileType === 'link' ? 'Open link' : 'Download'}
                                    >
                                        {resource.fileType === 'link' ? <FaLink size={12} /> : <FaDownload size={12} />}
                                    </button>
                                    {(isTeacherUser || (userId && resource.uploadedBy?._id === userId)) && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingResourceId(resource._id);
                                                    setEditTitle(resource.title || resource.fileName || '');
                                                    setEditDesc(resource.description || '');
                                                }}
                                                className="p-2 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <FaEdit size={11} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(resource._id)}
                                                className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <FaTrash size={11} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ResourceManager;
