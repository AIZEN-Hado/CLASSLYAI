import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaArrowRight } from 'react-icons/fa';
import api from '../../api/axios';

const CheckoutSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [course, setCourse] = useState(null);

    const sessionId = searchParams.get('session_id');
    const MAX_RETRIES = 15; // 15 retries * 2s = 30 seconds max

    useEffect(() => {
        if (sessionId) {
            checkPaymentStatus(0);
        } else {
            setStatus('error');
        }
    }, [sessionId]);

    const checkPaymentStatus = async (retryCount) => {
        try {
            const res = await api.get(`/purchase/session/${sessionId}`);
            setCourse(res.data.course);

            if (res.data.status === 'completed') {
                setStatus('success');
            } else if (res.data.status === 'pending') {
                if (retryCount >= MAX_RETRIES) {
                    setStatus('error');
                    return;
                }
                setTimeout(() => checkPaymentStatus(retryCount + 1), 2000);
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-zinc-200 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-600 dark:text-zinc-400">Verifying your payment...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaTimesCircle className="text-4xl text-red-500" />
                    </div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                        Payment failed
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                        Something went wrong with your payment. Please try again.
                    </p>
                    <Link
                        to="/marketplace"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Back to Marketplace <FaArrowRight />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Success Animation */}
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaCheckCircle className="text-4xl text-green-500" />
                </div>

                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
                    Payment complete
                </h1>

                <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                    Thank you for your purchase
                </p>

                {course && (
                    <p className="text-lg font-medium text-zinc-900 dark:text-white mb-8">
                        You now have access to <span className="text-blue-500">{course.title}</span>
                    </p>
                )}

                <div className="space-y-4">
                    {course && (
                        <Link
                            to={`/course/${course._id}`}
                            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Start learning now
                        </Link>
                    )}

                    <Link
                        to="/my-purchases"
                        className="block w-full px-6 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        View my purchases
                    </Link>

                    <Link
                        to="/marketplace"
                        className="block text-blue-500 hover:text-blue-600 font-medium"
                    >
                        Continue shopping
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
