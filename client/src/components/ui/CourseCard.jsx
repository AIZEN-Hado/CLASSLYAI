import { Link } from 'react-router-dom';
import { FaUsers, FaClock, FaPlayCircle } from 'react-icons/fa';
import StarRating from './StarRating';
import PriceDisplay from './PriceDisplay';

const CourseCard = ({ course }) => {
    const {
        _id,
        title,
        description,
        thumbnail,
        price,
        originalPrice,
        currency,
        category,
        level,
        rating,
        enrollmentCount,
        user: instructor,
        totalDuration
    } = course;

    const formatDuration = (minutes) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    return (
        <Link
            to={`/marketplace/course/${_id}`}
            className="group bg-white dark:bg-ios-dark-bg2 rounded-ios-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 overflow-hidden border border-black/5 dark:border-white/5 flex flex-col"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-ios-gray5 dark:bg-ios-dark-bg3">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <FaPlayCircle className="text-4xl text-ios-gray3" />
                    </div>
                )}
                {category && (
                    <span className="absolute top-2 left-2 bg-ios-blue/90 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        {category}
                    </span>
                )}
                {level && (
                    <span className="absolute top-2 right-2 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                        {level}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-[15px] text-slate-900 dark:text-white line-clamp-2 mb-1">
                    {title}
                </h3>

                {instructor && (
                    <p className="text-[13px] text-ios-gray dark:text-ios-gray2 mb-2">
                        {instructor.name}
                    </p>
                )}

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-[13px] text-ios-orange">{rating?.average?.toFixed(1) || '0.0'}</span>
                    <StarRating rating={rating?.average || 0} size="sm" />
                    <span className="text-[12px] text-ios-gray dark:text-ios-gray2">
                        ({rating?.count || 0})
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[12px] text-ios-gray dark:text-ios-gray2 mb-3">
                    <span className="flex items-center gap-1">
                        <FaUsers />
                        {enrollmentCount || 0} students
                    </span>
                    {totalDuration > 0 && (
                        <span className="flex items-center gap-1">
                            <FaClock />
                            {formatDuration(totalDuration)}
                        </span>
                    )}
                </div>

                {/* Price - pushed to bottom */}
                <div className="mt-auto pt-2 border-t border-black/5 dark:border-white/5">
                    <PriceDisplay
                        price={price}
                        originalPrice={originalPrice}
                        currency={currency}
                        size="sm"
                    />
                </div>
            </div>
        </Link>
    );
};

export default CourseCard;
