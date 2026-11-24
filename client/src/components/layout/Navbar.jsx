import { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import ThemeContext from '../../context/ThemeContext';
import { FaMoon, FaSun, FaUserCircle, FaSignOutAlt, FaGraduationCap, FaSearch, FaTimes, FaChevronDown, FaArrowLeft, FaStore, FaShoppingBag, FaChalkboardTeacher, FaRobot, FaChartLine, FaUserSecret, FaHistory, FaClipboardList } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import api from '../../api/axios';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState('all'); // all, enrolled, created
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const searchRef = useRef(null);
    const mobileInputRef = useRef(null);
    const filterDropdownRef = useRef(null);

    const filterOptions = [
        { value: 'all', label: 'All' },
        { value: 'enrolled', label: 'Enrolled' },
        { value: 'created', label: 'Created' }
    ];

    const onLogout = () => {
        logout();
        navigate('/login');
        setIsMenuOpen(false);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setIsFilterDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Focus mobile input when opened
    useEffect(() => {
        if (isMobileSearchOpen && mobileInputRef.current) {
            mobileInputRef.current.focus();
        }
    }, [isMobileSearchOpen]);

    // Search courses when query changes
    useEffect(() => {
        const searchCourses = async () => {
            if (!searchQuery.trim() || !user) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await api.get('/courses/search', {
                    params: { q: searchQuery, filter: searchFilter }
                });
                setSearchResults(res.data);
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchCourses, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, searchFilter, user]);

    const handleResultClick = (result) => {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchFocused(false);
        setIsMobileSearchOpen(false);
        if (result.type === 'enrolled') {
            navigate(`/course/${result._id}`);
        } else {
            navigate(`/admin/course/${result._id}`);
        }
    };

    const closeMobileSearch = () => {
        setIsMobileSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    // Search results component (reused for desktop and mobile)
    const SearchResults = () => (
        <>
            {isSearching ? (
                <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="mt-2">Searching</p>
                </div>
            ) : searchResults.length > 0 ? (
                <div className="py-2">
                    {searchResults.map((result) => (
                        <button
                            key={`${result.type}-${result._id}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between gap-3"
                        >
                            <span className="text-sm text-zinc-900 dark:text-white truncate">{result.title}</span>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${result.type === 'enrolled'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                }`}>
                                {result.type === 'enrolled' ? 'Enrolled' : 'Created'}
                            </span>
                        </button>
                    ))}
                </div>
            ) : searchQuery.trim() ? (
                <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                    No courses found for "{searchQuery}"
                </div>
            ) : null}
        </>
    );

    const isImpersonating = localStorage.getItem('isImpersonating') === 'true';

    // Toggle CSS class on <html> so all sticky elements adjust via var(--navbar-height)
    useEffect(() => {
        if (isImpersonating) {
            document.documentElement.classList.add('impersonating');
        } else {
            document.documentElement.classList.remove('impersonating');
        }
    }, [isImpersonating]);

    const handleReturnToAdmin = () => {
        const adminToken = localStorage.getItem('adminToken');
        const adminUserCache = localStorage.getItem('adminUserCache');
        if (adminToken) {
            localStorage.setItem('token', adminToken);
            localStorage.setItem('userCache', adminUserCache);
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUserCache');
            localStorage.removeItem('isImpersonating');
            window.location.href = '/admin/dashboard';
        }
    };

    return (
        <>
            <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-300">
                {isImpersonating && (
                    <div className="bg-amber-500 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2">
                        <FaUserSecret className="text-[11px]" />
                        <span>Viewing as <strong>{user?.name}</strong> ({user?.email})</span>
                        <button
                            onClick={handleReturnToAdmin}
                            className="ml-1 px-2.5 py-0.5 bg-white text-amber-600 rounded text-[11px] font-semibold hover:bg-amber-50 transition-colors"
                        >
                            Return to admin
                        </button>
                    </div>
                )}
                <div className="w-full px-4 md:px-8 h-16 flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-blue-600 flex items-center justify-center text-white transition-colors duration-300">
                            <FaGraduationCap size={18} />
                        </div>
                        <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                            Skill Path
                        </span>
                    </Link>

                    {/* Desktop Search Bar */}
                    {user && (
                        <div className="hidden md:flex flex-1 max-w-lg mx-8" ref={searchRef}>
                            <div className="relative w-full">
                                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
                                    {/* Custom Dropdown Filter */}
                                    <div className="relative border-r border-zinc-200 dark:border-zinc-700" ref={filterDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                            className="flex items-center gap-1.5 bg-transparent text-xs font-medium text-zinc-600 dark:text-zinc-300 pl-3 pr-2 py-2.5 cursor-pointer focus:outline-none rounded-l-lg hover:text-zinc-900 dark:hover:text-white transition-colors"
                                        >
                                            {filterOptions.find(o => o.value === searchFilter)?.label}
                                            <FaChevronDown className={`text-zinc-400 text-[11px] transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Custom Dropdown Menu */}
                                        {isFilterDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-28 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                                                {filterOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setSearchFilter(option.value);
                                                            setIsFilterDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${searchFilter === option.value
                                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Search Input */}
                                    <div className="flex-1 flex items-center">
                                        <FaSearch className="ml-3 text-zinc-400 text-sm" />
                                        <input
                                            type="text"
                                            placeholder="Search courses"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setIsSearchFocused(true)}
                                            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 px-3 py-2.5 focus:outline-none"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                            >
                                                <FaTimes size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Desktop Search Results Dropdown */}
                                {isSearchFocused && (searchQuery.trim() || isSearching) && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50 max-h-80 overflow-y-auto">
                                        <SearchResults />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Mobile Search Button */}
                        {user && (
                            <button
                                onClick={() => setIsMobileSearchOpen(true)}
                                className="md:hidden p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <FaSearch size={18} />
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
                        >
                            {theme === 'light' ? <FaMoon size={18} /> : <FaSun size={18} />}
                        </button>

                        {/* Notifications */}
                        {user && <NotificationBell />}

                        {user ? (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-transparent focus:border-zinc-200 dark:focus:border-zinc-700"
                                >
                                    <span className="hidden md:block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                        {user.name}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-300 overflow-hidden">
                                        {user.profileImage ? (
                                            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                        ) : user.name ? user.name.charAt(0).toUpperCase() : <FaUserCircle />}
                                    </div>
                                </button>

                                {/* Dropdown Menu */}
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 py-1 animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 md:hidden">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{user.name}</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                                        </div>

                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <FaUserCircle size={14} />
                                            My profile
                                        </Link>

                                        <Link
                                            to="/my-activity"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <FaHistory size={14} />
                                            My activity
                                        </Link>
                                        <Link
                                            to="/my-purchases"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <FaShoppingBag size={14} />
                                            My purchases
                                        </Link>
                                        {(user.role === 'instructor' || user.role === 'admin') && (
                                            <>
                                                <Link
                                                    to="/instructor/dashboard"
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    <FaChalkboardTeacher size={14} />
                                                    Instructor dashboard
                                                </Link>
                                                <Link
                                                    to="/instructor/ai-settings"
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    <FaRobot size={14} />
                                                    AI Settings
                                                </Link>
                                            </>
                                        )}

                                        {user.role === 'admin' && (
                                            <>
                                                <Link
                                                    to="/admin/dashboard"
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    <FaChartLine size={14} />
                                                    Admin dashboard
                                                </Link>
                                                <Link
                                                    to="/admin/activities"
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    <FaClipboardList size={14} />
                                                    Activity logs
                                                </Link>
                                            </>
                                        )}

                                        <button
                                            onClick={onLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2"
                                        >
                                            <FaSignOutAlt size={14} />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link to="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="h-9 inline-flex items-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors active:scale-[0.98]"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Search Modal - Full Screen */}
            {isMobileSearchOpen && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 md:hidden">
                    {/* Mobile Search Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                        <button
                            onClick={closeMobileSearch}
                            className="p-2 -ml-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                            <FaArrowLeft size={18} />
                        </button>
                        <div className="flex-1 flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                            <FaSearch className="ml-3 text-zinc-400 text-sm" />
                            <input
                                ref={mobileInputRef}
                                type="text"
                                placeholder="Search courses"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 px-3 py-3 focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                >
                                    <FaTimes size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Filter Tabs */}
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'enrolled', label: 'Enrolled' },
                            { value: 'created', label: 'Created' }
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSearchFilter(option.value)}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${searchFilter === option.value
                                    ? 'border-b-2 border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                                    : 'text-zinc-500 dark:text-zinc-400'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {/* Mobile Search Results */}
                    <div className="overflow-y-auto" style={{ height: 'calc(100vh - 120px)' }}>
                        {searchQuery.trim() ? (
                            <SearchResults />
                        ) : (
                            <div className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                                <FaSearch className="mx-auto text-3xl mb-3 text-zinc-300 dark:text-zinc-600" />
                                <p className="text-sm">Search for your courses</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;