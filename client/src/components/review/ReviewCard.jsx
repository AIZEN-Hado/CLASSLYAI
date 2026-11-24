import StarRating from '../ui/StarRating';
import { FaThumbsUp, FaUser } from 'react-icons/fa';

const ReviewCard = ({ review, onMarkHelpful }) => {
    const { user, rating, comment, helpful, createdAt } = review;

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    {user?.profileImage ? (
                        <img
                            src={user.profileImage}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <FaUser className="text-zinc-400" />
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-zinc-900 dark:text-white">
                            {user?.name || 'Anonymous'}
                        </h4>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDate(createdAt)}
                        </span>
                    </div>
                    <StarRating rating={rating} size="sm" />
                </div>
            </div>

            {/* Comment */}
            {comment && (
                <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-3">
                    {comment}
                </p>
            )}

            {/* Helpful */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onMarkHelpful && onMarkHelpful(review._id)}
                    className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                    <FaThumbsUp />
                    <span>Helpful ({helpful || 0})</span>
                </button>
            </div>
        </div>
    );
};

export default ReviewCard;
