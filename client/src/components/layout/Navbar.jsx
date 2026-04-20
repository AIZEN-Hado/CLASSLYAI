import { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import ThemeContext from '../../context/ThemeContext';
import { FaMoon, FaSun, FaUserCircle, FaSignOutAlt, FaGraduationCap, FaSearch, FaTimes, FaChevronDown, FaArrowLeft, FaStore, FaShoppingBag, FaChalkboardTeacher, FaRobot, FaChartLine } from 'react-icons/fa';
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

    const isStudent = user && user.role === 'student';
    const filterOptions = isStudent
        ? [{ value: 'all', label: 'All' }, { value: 'enrolled', label: 'Enrolled' }]
        : [{ value: 'all', label: 'All' }, { value: 'enrolled', label: 'Enrolled' }, { value: 'created', label: 'Created' }];

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
                <div className="px-4 py-6 text-[15px] text-ios-gray dark:text-ios-gray2 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-ios-gray3 border-t-ios-blue rounded-full animate-spin"></div>
                    <p className="mt-2">Searching...</p>
                </div>
            ) : searchResults.length > 0 ? (
                <div className="py-1">
                    {searchResults.map((result) => (
                        <button
                            key={`${result.type}-${result._id}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full px-4 py-3 text-left hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 active:bg-ios-gray5 dark:active:bg-ios-dark-bg4 transition-colors flex items-center justify-between gap-3"
                        >
                            <span className="text-[15px] text-slate-900 dark:text-white truncate">{result.title}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${result.type === 'enrolled'
                                ? 'bg-ios-blue/10 text-ios-blue'
                                : 'bg-ios-green/10 text-ios-green'
                                }`}>
                                {result.type === 'enrolled' ? 'Enrolled' : 'Created'}
                            </span>
                        </button>
                    ))}
                </div>
            ) : searchQuery.trim() ? (
                <div className="px-4 py-6 text-[15px] text-ios-gray dark:text-ios-gray2 text-center">
                    No courses found for "{searchQuery}"
                </div>
            ) : null}
        </>
    );

    return (
        <>
            <nav className="sticky top-0 z-50 w-full border-b border-black/10 dark:border-white/10 bg-white/75 dark:bg-ios-dark-bg/75 backdrop-blur-2xl transition-colors duration-300">
                <div className="container mx-auto px-4 h-14 flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-ios-lg bg-ios-blue flex items-center justify-center text-white shadow-sm">
                            <FaGraduationCap size={16} />
                        </div>
                        <span className="text-[17px] font-semibold text-slate-900 dark:text-white tracking-tight">
                            ClasslyAI
                        </span>
                    </Link>

                    {/* Desktop Search Bar */}
                    {user && (
                        <div className="hidden md:flex flex-1 max-w-lg mx-8" ref={searchRef}>
                            <div className="relative w-full">
                                <div className="flex items-center bg-ios-gray5/80 dark:bg-ios-dark-bg3/80 rounded-[10px] border border-black/5 dark:border-white/5 focus-within:ring-2 focus-within:ring-ios-blue focus-within:border-transparent transition-all">
                                    {/* Custom Dropdown Filter */}
                                    <div className="relative border-r border-black/10 dark:border-white/10" ref={filterDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                            className="flex items-center gap-1.5 bg-transparent text-xs font-medium text-ios-gray dark:text-ios-gray2 pl-3 pr-2 py-2.5 cursor-pointer focus:outline-none rounded-l-[10px] hover:text-slate-900 dark:hover:text-white transition-colors"
                                        >
                                            {filterOptions.find(o => o.value === searchFilter)?.label}
                                            <FaChevronDown className={`text-ios-gray3 text-[10px] transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Custom Dropdown Menu */}
                                        {isFilterDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-28 bg-white dark:bg-ios-dark-bg2 rounded-ios-lg shadow-xl border border-black/5 dark:border-white/5 py-1 z-50">
                                                {filterOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setSearchFilter(option.value);
                                                            setIsFilterDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${searchFilter === option.value
                                                            ? 'text-ios-blue'
                                                            : 'text-slate-600 dark:text-ios-gray2 hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3'
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
                                        <FaSearch className="ml-3 text-ios-gray text-sm" />
                                        <input
                                            type="text"
                                            placeholder="Search courses..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setIsSearchFocused(true)}
                                            className="flex-1 bg-transparent text-[15px] text-slate-900 dark:text-white placeholder-ios-gray px-3 py-2.5 focus:outline-none"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="pr-3 text-ios-gray3 hover:text-ios-gray dark:hover:text-ios-gray2"
                                            >
                                                <FaTimes size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Desktop Search Results Dropdown */}
                                {isSearchFocused && (searchQuery.trim() || isSearching) && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-ios-dark-bg2/90 backdrop-blur-xl rounded-ios-xl shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden z-50 max-h-80 overflow-y-auto">
                                        <SearchResults />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-1 md:gap-2">
                        {/* Mobile Search Button */}
                        {user && (
                            <button
                                onClick={() => setIsMobileSearchOpen(true)}
                                className="md:hidden p-2 rounded-full text-ios-gray dark:text-ios-gray2 hover:bg-ios-gray5 dark:hover:bg-ios-dark-bg3 active:scale-95 transition-all"
                            >
                                <FaSearch size={17} />
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-ios-gray dark:text-ios-gray2 hover:bg-ios-gray5 dark:hover:bg-ios-dark-bg3 active:scale-95 transition-all"
                            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
                        >
                            {theme === 'light' ? <FaMoon size={17} /> : <FaSun size={17} />}
                        </button>

                        {user ? (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2 py-1 px-2 rounded-full hover:bg-ios-gray5 dark:hover:bg-ios-dark-bg3 active:scale-95 transition-all"
                                >
                                    <span className="hidden md:block text-[15px] font-medium text-slate-700 dark:text-ios-dark-label">
                                        {user.name}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-ios-blue flex items-center justify-center text-white text-sm font-semibold">
                                        {user.name ? user.name.charAt(0).toUpperCase() : <FaUserCircle />}
                                    </div>
                                </button>

                                {/* Dropdown Menu */}
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-52 bg-white/90 dark:bg-ios-dark-bg2/90 backdrop-blur-xl rounded-ios-xl shadow-2xl border border-black/5 dark:border-white/5 py-1 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 md:hidden">
                                            <p className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                                            <p className="text-xs text-ios-gray dark:text-ios-gray2 truncate">{user.email}</p>
                                        </div>

                                        <Link
                                            to="/profile"
                                            className="block px-4 py-2.5 text-[15px] text-slate-900 dark:text-white hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            My Profile
                                        </Link>

                                        <Link
                                            to="/my-purchases"
                                            className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-slate-900 dark:text-white hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <FaShoppingBag size={14} className="text-ios-blue" />
                                            My Purchases
                                        </Link>
                                        <Link
                                            to="/answer-checker"
                                            className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-slate-900 dark:text-white hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <FaRobot size={14} className="text-ios-purple" />
                                            Answer Checker
                                        </Link>
                                        {(user.role === 'instructor' || user.role === 'admin') && (
                                            <>
                                                <Link
                                                    to="/instructor/dashboard"
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-slate-900 dark:text-white hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 transition-colors"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    <FaChalkboardTeacher size={14} className="text-ios-orange" />
                                                    Instructor Dashboard
                                                </Link>
                                                <Link
                                                    to="/instructor/ai-settings"
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-slate-900 dark:text-white hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 transition-colors"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    <FaRobot size={14} className="text-ios-purple" />
                                                    AI Settings
                                                </Link>
                                            </>
                                        )}

                                        {user.role === 'admin' && (
                                            <>
                                                <Link
                                                    to="/admin/dashboard"
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-slate-900 dark:text-white hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 transition-colors"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    <FaChartLine size={14} className="text-ios-blue" />
                                                    Admin Dashboard
                                                </Link>
                                                <Link
                                                    to="/admin/activities"
                                                    className="block px-4 py-2.5 text-[15px] text-slate-900 dark:text-white hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 transition-colors"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    Activity Logs
                                                </Link>
                                            </>
                                        )}

                                        <div className="border-t border-black/5 dark:border-white/5 mt-1" />
                                        <button
                                            onClick={onLogout}
                                            className="w-full text-left px-4 py-2.5 text-[15px] text-ios-red hover:bg-red-50 dark:hover:bg-ios-red/10 transition-colors flex items-center gap-2.5"
                                        >
                                            <FaSignOutAlt size={14} />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link to="/login" className="text-[15px] font-medium text-ios-blue">
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-ios-blue text-white px-4 py-1.5 rounded-full text-[15px] font-semibold active:opacity-70 transition-opacity"
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
                <div className="fixed inset-0 z-[100] bg-ios-gray6 dark:bg-ios-dark-bg md:hidden">
                    {/* Mobile Search Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-black/10 dark:border-white/10 bg-white/75 dark:bg-ios-dark-bg/75 backdrop-blur-xl">
                        <button
                            onClick={closeMobileSearch}
                            className="p-1.5 rounded-full text-ios-blue active:opacity-70 transition-opacity"
                        >
                            <FaArrowLeft size={17} />
                        </button>
                        <div className="flex-1 flex items-center bg-ios-gray5 dark:bg-ios-dark-bg3 rounded-[10px]">
                            <FaSearch className="ml-3 text-ios-gray text-sm" />
                            <input
                                ref={mobileInputRef}
                                type="text"
                                placeholder="Search courses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-[15px] text-slate-900 dark:text-white placeholder-ios-gray px-3 py-2.5 focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="pr-3 text-ios-gray3"
                                >
                                    <FaTimes size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Filter Tabs */}
                    <div className="flex border-b border-black/10 dark:border-white/10 bg-white dark:bg-ios-dark-bg2">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSearchFilter(option.value)}
                                className={`flex-1 py-3 text-[15px] font-medium transition-colors ${
                                    searchFilter === option.value
                                    ? 'text-ios-blue border-b-2 border-ios-blue'
                                    : 'text-ios-gray dark:text-ios-gray2'
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
                            <div className="px-4 py-12 text-center text-ios-gray dark:text-ios-gray2">
                                <FaSearch className="mx-auto text-3xl mb-3 text-ios-gray3" />
                                <p className="text-[15px]">Search for your courses</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;