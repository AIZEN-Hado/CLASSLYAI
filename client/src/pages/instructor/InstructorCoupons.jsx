import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import ManageCoupons from '../course/ManageCoupons';

const InstructorCoupons = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/instructor/dashboard')}
                        className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                        <FaArrowLeft />
                    </button>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                        Manage coupons
                    </h1>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <ManageCoupons embeddedCourseId={id} />
                </div>
            </div>
        </div>
    );
};

export default InstructorCoupons;
