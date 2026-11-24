import { FaUser, FaBook, FaUsers, FaStar } from 'react-icons/fa';

const InstructorProfileCard = ({ instructor, courseCount, studentCount }) => {
    const { name, bio, profileImage } = instructor || {};

    return (
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profileImage ? (
                        <img
                            src={profileImage}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <FaUser className="text-2xl text-white" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1">
                    <h3 className="font-medium text-lg text-zinc-900 dark:text-white mb-1">
                        {name || 'Instructor'}
                    </h3>

                    {bio && (
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3 line-clamp-2">
                            {bio}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {courseCount !== undefined && (
                            <span className="flex items-center gap-1">
                                <FaBook className="text-zinc-400" />
                                {courseCount} courses
                            </span>
                        )}
                        {studentCount !== undefined && (
                            <span className="flex items-center gap-1">
                                <FaUsers className="text-green-500" />
                                {studentCount} students
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstructorProfileCard;
