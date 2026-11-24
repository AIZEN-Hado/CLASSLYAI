import { useState, useContext, useEffect } from 'react';
import TabLabel from '../components/ui/TabLabel';
import AuthContext from '../context/AuthContext';
import api from '../api/axios';
import { showSuccess, showError } from '../utils/toast';
import { FaLock, FaExclamationTriangle, FaEye, FaEyeSlash, FaGoogle, FaPencilAlt, FaUser, FaImages, FaShieldAlt } from 'react-icons/fa';

// Avatar categories with DiceBear (no package needed — just image URLs)
const bg = ['b6e3f4','c0aede','ffd5dc','d1f4d1','ffdfbf','c1e7e3','e8d5f5','fce4b8','d4f0ff','ffe0e6','f0e6ff','dff5e3'];
const AVATAR_CATEGORIES = [
    {
        name: 'People',
        avatars: ['Alex','Sam','Jordan','Riley','Harley','Quinn','Morgan','Taylor','Casey','Devon','Avery','Logan'].map((s,i) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Robots',
        avatars: ['Mochi','Pixel','Nova','Bolt','Spark','Echo','Glitch','Chip','Circuit','Nano','Byte','Servo'].map((s,i) => `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Emoji',
        avatars: ['Nala','Felix','Milo','Luna','Coco','Kiwi','Peanut','Bubbles','Sunny','Pepper','Maple','Toffee'].map((s) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${s}`),
    },
    {
        name: 'Sketches',
        avatars: ['Zara','River','Sky','Sage','Ember','Wren','Fern','Brook','Cedar','Lark','Iris','Hazel'].map((s,i) => `https://api.dicebear.com/7.x/lorelei/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Minimal',
        avatars: ['Ash','Kai','Drew','Blake','Remy','Jude','Tate','Lane','Finn','Reese','Shay','Jules'].map((s,i) => `https://api.dicebear.com/7.x/notionists/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Pixel Art',
        avatars: ['Storm','Blaze','Frost','Dusk','Flint','Drift','Shade','Rust','Moss','Clay','Onyx','Jade'].map((s,i) => `https://api.dicebear.com/7.x/pixel-art/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Adventurers',
        avatars: ['Aria','Rowan','Thane','Lyra','Orion','Selene','Atlas','Freya','Caspian','Indigo','Sable','Phoenix'].map((s,i) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Big Ears',
        avatars: ['Clover','Pippin','Basil','Thistle','Bramble','Nutmeg','Olive','Juniper','Yarrow','Poppy','Sorrel','Tansy'].map((s,i) => `https://api.dicebear.com/7.x/big-ears/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Thumbs',
        avatars: ['Ruby','Jade','Opal','Amber','Pearl','Coral','Topaz','Ivy','Garnet','Flint','Onyx','Dune'].map((s,i) => `https://api.dicebear.com/7.x/thumbs/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
    {
        name: 'Shapes',
        avatars: ['Alpha','Beta','Gamma','Delta','Sigma','Theta','Omega','Zeta','Kappa','Lambda','Phi','Psi'].map((s,i) => `https://api.dicebear.com/7.x/shapes/svg?seed=${s}&backgroundColor=${bg[i]}`),
    },
];

// Bio templates by role — {name} is replaced with first name
const BIO_TEMPLATES = {
    student: [
        "Hey, I'm {name}! Currently learning and leveling up my skills one course at a time.",
        "Curious mind on a learning journey. I believe growth happens outside the comfort zone.",
        "Student by day, skill builder by night. Always looking for the next thing to master.",
        "{name} here — passionate about learning new things and connecting with fellow students.",
        "Just a student who loves exploring new ideas. Currently on a mission to learn something new every week.",
        "Learning is my superpower. I'm {name}, and I'm here to grow, build, and share.",
        "Driven by curiosity. I pick up new skills like they're collectibles.",
        "Hi! I'm {name} — a lifelong learner who believes that every expert was once a beginner.",
        "On a quest to turn curiosity into competence. One course at a time.",
        "I don't just take courses — I live them. Always building, always improving.",
        "{name} | Student | Building skills that matter.",
        "Coffee, code, and courses — that's my daily routine.",
        "Not the smartest in the room, but definitely the most curious.",
        "Learning something new every day and loving every minute of it.",
        "Future expert in the making. Currently leveling up on Skill Path.",
    ],
    instructor: [
        "Hi, I'm {name} — an instructor passionate about making complex topics feel simple.",
        "Teaching is my craft. I build courses that help students go from confused to confident.",
        "Instructor & lifelong learner. I believe great teaching can change lives.",
        "{name} here. I turn real-world experience into actionable lessons.",
        "I've been where my students are. That's why I teach the way I wish I was taught.",
        "Passionate educator who believes learning should be engaging, not boring.",
        "I don't just teach — I mentor. Let's grow together.",
        "Building courses that bridge the gap between theory and practice.",
        "{name} | Instructor | Making education accessible and practical.",
        "My goal? Help every student unlock their potential through well-crafted courses.",
        "Teaching isn't just my job — it's my way of giving back.",
        "I simplify the complex. That's what I do best.",
        "Educator with a passion for clarity. If you're confused, that's on me — let's fix it.",
        "I create courses I wish existed when I was starting out.",
        "Helping students succeed is what gets me out of bed every morning.",
    ],
    admin: [
        "Platform admin keeping things running smoothly behind the scenes.",
        "Hi, I'm {name} — helping manage and grow the Skill Path community.",
        "Building a better learning experience, one improvement at a time.",
        "{name} | Admin | Making sure everything works so you can focus on learning.",
        "Behind every great platform is someone making sure it doesn't break. That's me.",
        "I keep the gears turning so students and instructors can do their best work.",
        "Admin by role, builder by passion. Always improving the platform.",
        "Making Skill Path the best place to learn — that's my mission.",
        "{name} here. I manage the platform so you can focus on what matters: learning.",
        "If something works well on this platform, I probably had a hand in it.",
    ],
};

// Fix initials — strip non-letter chars like parentheses
const getInitials = (name = '') =>
    name.replace(/[^a-zA-Z\s]/g, '').trim()
        .split(/\s+/).filter(Boolean)
        .map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const roleBadge = {
    admin:      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    instructor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    student:    'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
};

const inputClass = 'w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

const ProfileAvatar = ({ src, name, size = 80 }) => {
    const [imgError, setImgError] = useState(false);

    // Reset error when src changes so new avatar previews instantly
    useEffect(() => { setImgError(false); }, [src]);

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={name}
                width={size}
                height={size}
                onError={() => setImgError(true)}
                className="rounded-full object-cover"
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <div
            className="rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-medium text-zinc-700 dark:text-zinc-200"
            style={{ width: size, height: size, fontSize: size * 0.3 }}
        >
            {getInitials(name)}
        </div>
    );
};

const Profile = () => {
    const { user, updateProfile } = useContext(AuthContext);

    // Profile edit state
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', bio: '', profileImage: '' });
    const [profileLoading, setProfileLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('about');
    const [bioRole, setBioRole] = useState(user?.role || 'student');
    const [customUrl, setCustomUrl] = useState('');

    // Password state
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwError, setPwError] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

    const isGoogleUser = !!user?.googleId;

    const startEditing = () => {
        setProfileForm({ name: user?.name || '', bio: user?.bio || '', profileImage: user?.profileImage || '' });
        setCustomUrl('');
        setEditingProfile(true);
    };

    const cancelEditing = () => { setEditingProfile(false); setActiveTab('about'); };

    const handleSaveProfile = async () => {
        if (!profileForm.name.trim()) return;
        setProfileLoading(true);
        try {
            await updateProfile({ name: profileForm.name.trim(), bio: profileForm.bio.trim(), profileImage: profileForm.profileImage });
            setEditingProfile(false);
            setActiveTab('about');
            showSuccess('Profile updated');
        } catch (err) {
            showError(err, 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = passwords;
        if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
        if (newPassword.length < 6) { setPwError('Must be at least 6 characters'); return; }
        setPwLoading(true);
        try {
            await api.put('/auth/updatepassword', { currentPassword, newPassword });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showSuccess('Password updated');
        } catch (err) {
            setPwError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setPwLoading(false);
        }
    };

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    const previewImage = editingProfile ? profileForm.profileImage : user?.profileImage;
    const previewName  = editingProfile ? profileForm.name : user?.name;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-5xl mx-auto px-4 py-10">
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* ── Left Sidebar ── */}
                    <div className="w-full lg:w-72 shrink-0">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">

                            {/* Top gradient banner */}
                            <div className="h-24 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_15px,rgba(0,0,0,0.05)_15px,rgba(0,0,0,0.05)_16px)] dark:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_15px,rgba(255,255,255,0.05)_15px,rgba(255,255,255,0.05)_16px)]" />

                            <div className="px-6 pb-6 flex flex-col items-center text-center">
                                {/* Avatar */}
                                <div className="relative">
                                    <div
                                        className={`ring-4 ring-white dark:ring-zinc-900 rounded-full ${editingProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                        onClick={() => editingProfile && setActiveTab('avatars')}
                                    >
                                        <ProfileAvatar src={previewImage} name={previewName} size={96} />
                                    </div>
                                    {editingProfile && (
                                        <button
                                            onClick={() => setActiveTab('avatars')}
                                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-colors border-2 border-white dark:border-zinc-900"
                                        >
                                            <FaPencilAlt className="text-[11px]" />
                                        </button>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="mt-4 w-full">
                                    {editingProfile ? (
                                        <input
                                            value={profileForm.name}
                                            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                                            maxLength={50}
                                            className="w-full text-center text-sm font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{user?.name}</h2>
                                    )}
                                </div>

                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 break-all">{user?.email}</p>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2 justify-center mt-3">
                                    <span className={`px-3 py-1 rounded-md text-xs font-medium capitalize ${roleBadge[user?.role] || roleBadge.student}`}>
                                        {user?.role}
                                    </span>
                                    {isGoogleUser && (
                                        <span className="px-3 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1">
                                            <FaGoogle className="text-[11px]" /> Google
                                        </span>
                                    )}
                                </div>

                                {memberSince && (
                                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3">Member since {memberSince}</p>
                                )}

                                {/* Action buttons */}
                                <div className="mt-5 w-full">
                                    {!editingProfile ? (
                                        <button
                                            onClick={startEditing}
                                            className="w-full py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            Edit profile
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={profileLoading || !profileForm.name.trim()}
                                                className="flex-1 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                                            >
                                                {profileLoading ? 'Saving…' : 'Save'}
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="flex-1 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Warnings badge */}
                        {user?.warnings?.length > 0 && (
                            <div className="mt-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/40 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaExclamationTriangle className="text-amber-500 text-xs shrink-0" />
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 ">Warnings</span>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">{user.warnings.length} of {user.maxWarnings || 2} issued</p>
                                <div className="w-full h-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${user.warnings.length >= (user.maxWarnings || 2) ? 'bg-red-500' : 'bg-amber-400'}`}
                                        style={{ width: `${Math.min(100, (user.warnings.length / (user.maxWarnings || 2)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right Main ── */}
                    <div className="flex-1">

                        {/* Tabs */}
                        <div className="border-b border-zinc-200 dark:border-zinc-800 mb-5">
                            <div className="flex items-center -mb-px overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'about', label: 'About', icon: FaUser },
                                    ...(editingProfile ? [{ id: 'avatars', label: 'Avatars', icon: FaImages }] : []),
                                    { id: 'security', label: 'Security', icon: FaShieldAlt },
                                    ...(user?.warnings?.length > 0 ? [{ id: 'warnings', label: 'Warnings', icon: FaExclamationTriangle }] : []),
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                                activeTab === tab.id
                                                    ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                                                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                            }`}
                                        >
                                            <Icon className="shrink-0 text-sm" />
                                            <TabLabel active={activeTab === tab.id}>{tab.label}</TabLabel>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── About Tab ── */}
                        {activeTab === 'about' && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Bio</h3>
                                    {editingProfile ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={profileForm.bio}
                                                onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                                                rows={3}
                                                maxLength={300}
                                                placeholder="Write a short bio"
                                                className={`${inputClass} resize-none`}
                                            />
                                            <div className="flex items-center justify-end">
                                                <span className="text-[11px] text-zinc-400">{profileForm.bio.length}/300</span>
                                            </div>

                                            {/* Bio suggestions */}
                                            <div className="pt-1">
                                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2.5">Pick a template</p>
                                                <div className="flex gap-2 mb-3">
                                                    {Object.keys(BIO_TEMPLATES).map((r) => (
                                                        <button
                                                            key={r}
                                                            type="button"
                                                            onClick={() => setBioRole(r)}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition ${
                                                                bioRole === r
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                                            }`}
                                                        >
                                                            {r}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                    {BIO_TEMPLATES[bioRole].map((tpl, i) => {
                                                        const bio = tpl.replace(/\{name\}/g, (user?.name || '').replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/)[0] || 'there');
                                                        return (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => setProfileForm(f => ({ ...f, bio }))}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition ${
                                                                    profileForm.bio === bio
                                                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                                        : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent'
                                                                }`}
                                                            >
                                                                {bio}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                            {user?.bio || <span className="italic text-zinc-400 dark:text-zinc-600">No bio yet. Click Edit Profile to add one.</span>}
                                        </p>
                                    )}
                                </div>

                                {/* Custom image URL — only when editing */}
                                {editingProfile && (
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Profile Image from URL</h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Paste a direct link to use as your profile picture.</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={customUrl}
                                                onChange={e => setCustomUrl(e.target.value)}
                                                placeholder="https://example.com/my-photo.jpg"
                                                className={`${inputClass} flex-1`}
                                            />
                                            <button
                                                onClick={() => { if (customUrl) { setProfileForm(f => ({ ...f, profileImage: customUrl })); setCustomUrl(''); } }}
                                                disabled={!customUrl}
                                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                Set
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Avatars Tab ── */}
                        {activeTab === 'avatars' && editingProfile && (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
                                {AVATAR_CATEGORIES.map((cat) => (
                                    <div key={cat.name}>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2.5 flex items-center gap-1.5 ">
                                            {cat.name}
                                        </p>
                                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                                            {cat.avatars.map((url, i) => (
                                                <button
                                                    key={url}
                                                    onClick={() => setProfileForm(f => ({ ...f, profileImage: url }))}
                                                    className={`rounded-xl overflow-hidden border-2 transition aspect-square ${profileForm.profileImage === url ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105' : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'}`}
                                                >
                                                    <img src={url} alt={`${cat.name}-${i}`} className="w-full h-full bg-white dark:bg-zinc-100 rounded-lg" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Security Tab ── */}
                        {activeTab === 'security' && (
                            <div className="space-y-4">
                                {/* Google linked notice */}
                                {isGoogleUser && (
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                            <FaGoogle className="text-red-500 text-sm" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">Google account linked</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">You can sign in with Google or your password.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Password form — always shown */}
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <FaLock className="text-zinc-500 dark:text-zinc-400 text-sm" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-zinc-900 dark:text-white text-sm">Change password</h3>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Update your account password</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Current password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPw.current ? 'text' : 'password'}
                                                    value={passwords.currentPassword}
                                                    onChange={e => { setPasswords(p => ({ ...p, currentPassword: e.target.value })); setPwError(''); }}
                                                    placeholder="Enter current password"
                                                    required
                                                    className={`${inputClass} pr-10`}
                                                />
                                                <button type="button" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                                    {showPw.current ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">New password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPw.new ? 'text' : 'password'}
                                                        value={passwords.newPassword}
                                                        onChange={e => { setPasswords(p => ({ ...p, newPassword: e.target.value })); setPwError(''); }}
                                                        placeholder="New password"
                                                        required
                                                        className={`${inputClass} pr-10`}
                                                    />
                                                    <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                                        {showPw.new ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Confirm password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPw.confirm ? 'text' : 'password'}
                                                        value={passwords.confirmPassword}
                                                        onChange={e => { setPasswords(p => ({ ...p, confirmPassword: e.target.value })); setPwError(''); }}
                                                        placeholder="Repeat new password"
                                                        required
                                                        className={`${inputClass} pr-10`}
                                                    />
                                                    <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                                        {showPw.confirm ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {pwError && (
                                            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                                                <FaExclamationTriangle className="text-xs shrink-0" />
                                                {pwError}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={pwLoading}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            {pwLoading ? 'Saving…' : 'Update password'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* ── Warnings Tab ── */}
                        {activeTab === 'warnings' && user?.warnings?.length > 0 && (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-800/40 overflow-hidden">
                                <div className="px-6 py-4 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                        <FaExclamationTriangle className="text-amber-500 text-sm" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-zinc-900 dark:text-white text-sm">Account warnings</h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.warnings.length} of {user.maxWarnings || 2} — further violations may result in suspension</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-3">
                                    {user.warnings.map((w, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                            <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                            <div>
                                                <p className="text-sm text-zinc-700 dark:text-zinc-300">{w.reason}</p>
                                                <p className="text-xs text-zinc-400 mt-0.5">{new Date(w.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-xs text-amber-600 dark:text-amber-500 text-center pt-1">If you believe this is a mistake, please contact the admin.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
