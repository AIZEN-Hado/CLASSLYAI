import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import AuthContext from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';
import { FaCheckCircle } from 'react-icons/fa';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

const perks = [
    'Create and publish unlimited courses',
    'Enroll students and track their progress',
    'A study assistant for questions about lectures',
    'Announcements to everyone enrolled',
    'Quiz builder and grading tools',
];

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { register, googleLogin } = useContext(AuthContext);
    const navigate = useNavigate();

    const { name, email, password } = formData;
    const onChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleGoogleSuccess = async (codeResponse) => {
        setIsGoogleLoading(true);
        try {
            await googleLogin(codeResponse.code);
            navigate('/');
            showSuccess('Account created successfully');
        } catch (error) {
            if (!error.handled) showError(error, 'Google sign-up failed');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const signUpWithGoogle = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: handleGoogleSuccess,
        onError: () => showError('Google sign-up failed'),
    });

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        try {
            await register(name, email, password);
            navigate('/');
            showSuccess('Account created successfully');
        } catch (error) {
            if (!error.handled) showError(error, 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden flex bg-zinc-50 dark:bg-zinc-950">

            {/* ── Left branding panel (hidden on mobile) ── */}
            <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col bg-zinc-900 dark:bg-zinc-950 overflow-hidden">
                {/* Ruled notebook lines */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,rgba(255,255,255,0.04)_31px,rgba(255,255,255,0.04)_32px)]" />

                <div className="relative z-10 flex flex-col h-full p-8 xl:p-12 justify-center">
                    <div className="mb-8 max-w-md">
                        <h1 className="text-4xl xl:text-5xl font-medium text-white leading-[1.08] tracking-[-0.02em]">
                            Teach a course or take one
                        </h1>
                        <p className="mt-4 text-zinc-400 text-base leading-7">
                            One free account for both. Publish your own lectures and quizzes, or enroll and track your progress.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {perks.map(perk => (
                            <div key={perk} className="flex items-center gap-3">
                                <FaCheckCircle className="text-zinc-500 shrink-0 text-xs" />
                                <p className="text-zinc-300 text-sm">{perk}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 bg-white dark:bg-zinc-900 overflow-y-auto">
                <div className="w-full max-w-sm mx-auto lg:mx-0">
                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-white">
                        Create your account
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Free for students and instructors
                    </p>

                    {/* Google button */}
                    <button
                        type="button"
                        onClick={() => signUpWithGoogle()}
                        disabled={isGoogleLoading || isLoading}
                        className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-750 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGoogleLoading ? (
                            <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : <GoogleIcon />}
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="my-4 flex items-center gap-3">
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">or sign up with email</span>
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                    </div>

                    <form onSubmit={onSubmit} className="space-y-3">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Full name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                value={name}
                                onChange={onChange}
                                placeholder="John Doe"
                                className="block w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={onChange}
                                placeholder="you@example.com"
                                className="block w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={onChange}
                                placeholder="••••••••"
                                className="block w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-500 transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-1 flex w-full justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating account...
                                </>
                            ) : 'Create account'}
                        </button>
                    </form>

                    <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
