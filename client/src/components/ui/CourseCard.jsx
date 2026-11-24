import { Link } from 'react-router-dom';
import { FaPlayCircle } from 'react-icons/fa';
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
            className="group bg-white dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors flex flex-col"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_15px,rgba(0,0,0,0.05)_15px,rgba(0,0,0,0.05)_16px)] dark:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_15px,rgba(255,255,255,0.05)_15px,rgba(255,255,255,0.05)_16px)]">
                        <FaPlayCircle className="text-3xl text-zinc-400 dark:text-zinc-500" />
                    </div>
                )}
                {category && (
                    <span className="absolute top-2 left-2 bg-zinc-900/70 text-white text-xs font-medium px-2 py-1 rounded-md">
                        {category}
                    </span>
                )}
                {level && (
                    <span className="absolute top-2 right-2 bg-zinc-900/70 text-white text-xs font-medium px-2 py-1 rounded-md">
                        {level}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-medium text-zinc-900 dark:text-white line-clamp-2 mb-1">
                    {title}
                </h3>

                {instructor && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                        {instructor.name}
                    </p>
                )}

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium tabular-nums text-zinc-900 dark:text-white">{rating?.average?.toFixed(1) || '0.0'}</span>
                    <StarRating rating={rating?.average || 0} size="sm" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        ({rating?.count || 0})
                    </span>
                </div>

                {/* Stats */}
                <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400 mb-3">
                    {enrollmentCount || 0} students{totalDuration > 0 && ` · ${formatDuration(totalDuration)}`}
                </p>

                {/* Price - pushed to bottom */}
                <div className="mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-700">
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
