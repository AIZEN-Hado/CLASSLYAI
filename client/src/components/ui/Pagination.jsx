import { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * Reusable Pagination Component
 * 
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items/records
 * @param {number} itemsPerPage - Current items per page limit
 * @param {function} onPageChange - Callback when page changes (page) => void
 * @param {function} onLimitChange - Callback when limit changes (limit) => void
 * @param {array} limitOptions - Array of limit options, default: [6, 15, 20, 30, 50, 100]
 * @param {boolean} showLimitSelector - Whether to show the limit dropdown
 * @param {boolean} compact - Use compact styling
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 15,
    onPageChange,
    onLimitChange,
    limitOptions = [6, 15, 20, 30, 50, 100],
    showLimitSelector = true,
    compact = false
}) => {
    const [pageInput, setPageInput] = useState(currentPage.toString());

    // Sync pageInput with currentPage when it changes externally
    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    // Calculate showing range
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Handle page input change
    const handlePageInputChange = (e) => {
        const value = e.target.value;
        // Only allow numbers
        if (value === '' || /^\d+$/.test(value)) {
            setPageInput(value);
        }
    };

    // Handle page input blur or enter - validate and navigate
    const handlePageInputSubmit = () => {
        let pageNum = parseInt(pageInput, 10);

        if (isNaN(pageNum) || pageNum < 1) {
            pageNum = 1;
        } else if (pageNum > totalPages) {
            pageNum = totalPages;
        }

        setPageInput(pageNum.toString());
        if (pageNum !== currentPage && onPageChange) {
            onPageChange(pageNum);
        }
    };

    // Handle key press in page input
    const handlePageInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            handlePageInputSubmit();
            e.target.blur();
        }
    };

    // Handle limit change
    const handleLimitChange = (e) => {
        const newLimit = parseInt(e.target.value, 10);
        if (onLimitChange) {
            onLimitChange(newLimit);
        }
    };

    // Handle previous page
    const handlePrevPage = () => {
        if (currentPage > 1 && onPageChange) {
            onPageChange(currentPage - 1);
        }
    };

    // Handle next page
    const handleNextPage = () => {
        if (currentPage < totalPages && onPageChange) {
            onPageChange(currentPage + 1);
        }
    };

    // Don't render if no items
    if (totalItems === 0 && !showLimitSelector) {
        return null;
    }

    return (
        <div className={`flex items-center justify-between gap-4 ${compact ? 'py-2' : 'px-6 py-4 border-t border-black/5 dark:border-white/5 bg-ios-gray6/50 dark:bg-ios-dark-bg/50'}`}>
            {/* Left side: Limit selector + Record info */}
            <div className="flex items-center gap-3">
                {showLimitSelector && (
                    <select
                        value={itemsPerPage}
                        onChange={handleLimitChange}
                        className="px-2 py-1.5 text-[13px] rounded-[8px] border border-black/10 dark:border-white/10 bg-white dark:bg-ios-dark-bg3 text-slate-700 dark:text-ios-gray2 focus:outline-none focus:ring-2 focus:ring-ios-blue cursor-pointer"
                    >
                        {limitOptions.map((limit) => (
                            <option key={limit} value={limit}>
                                {limit}
                            </option>
                        ))}
                    </select>
                )}
                <span className="text-[13px] text-ios-gray dark:text-ios-gray2">
                    Showing {startItem} - {endItem} of {totalItems} Records
                </span>
            </div>

            {/* Right side: Navigation */}
            <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className={`p-1.5 rounded-[8px] border transition-all ${
                        currentPage <= 1
                            ? 'border-black/5 dark:border-white/5 text-ios-gray3 dark:text-ios-dark-bg4 cursor-not-allowed'
                            : 'border-black/10 dark:border-white/10 text-ios-gray dark:text-ios-gray2 hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 active:scale-90'
                    }`}
                    aria-label="Previous page"
                >
                    <FaChevronLeft size={12} />
                </button>

                {/* Page Input */}
                <input
                    type="text"
                    value={pageInput}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputSubmit}
                    onKeyDown={handlePageInputKeyDown}
                    className="w-12 px-2 py-1.5 text-[13px] text-center rounded-[8px] border border-black/10 dark:border-white/10 bg-white dark:bg-ios-dark-bg3 text-slate-700 dark:text-ios-gray2 focus:outline-none focus:ring-2 focus:ring-ios-blue"
                    aria-label="Page number"
                />

                {/* Page info */}
                <span className="text-[13px] text-ios-gray dark:text-ios-gray2 whitespace-nowrap">
                    of {totalPages}
                </span>

                {/* Next Button */}
                <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    className={`p-1.5 rounded-[8px] border transition-all ${
                        currentPage >= totalPages
                            ? 'border-black/5 dark:border-white/5 text-ios-gray3 dark:text-ios-dark-bg4 cursor-not-allowed'
                            : 'border-black/10 dark:border-white/10 text-ios-gray dark:text-ios-gray2 hover:bg-ios-gray6 dark:hover:bg-ios-dark-bg3 active:scale-90'
                    }`}
                    aria-label="Next page"
                >
                    <FaChevronRight size={12} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
