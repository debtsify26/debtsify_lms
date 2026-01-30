import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';

const AuthScreen: React.FC = () => {
    const { login, signup, error, isLoading } = useAuth();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        // Validation
        if (!email || !password) {
            setLocalError('Email and password are required');
            return;
        }

        if (!isLoginMode && !fullName) {
            setLocalError('Full name is required for signup');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        try {
            if (isLoginMode) {
                await login(email, password);
            } else {
                await signup(email, password, fullName);
            }
        } catch (err: any) {
            setLocalError(err.message || 'Authentication failed');
        }
    };

    const errorMessage = localError || error;

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <div className="bg-accent-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">Debtsify</h1>
                    <p className="text-primary-200">Professional Loan Management System</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {/* Tab Switcher */}
                    <div className="flex gap-2 mb-6 bg-neutral-100 p-1 rounded-xl">
                        <button
                            onClick={() => setIsLoginMode(true)}
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${isLoginMode
                                    ? 'bg-white text-primary-700 shadow-md'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            <LogIn className="w-4 h-4 inline-block mr-2" />
                            Login
                        </button>
                        <button
                            onClick={() => setIsLoginMode(false)}
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${!isLoginMode
                                    ? 'bg-white text-primary-700 shadow-md'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            <UserPlus className="w-4 h-4 inline-block mr-2" />
                            Sign Up
                        </button>
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{errorMessage}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLoginMode && (
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                disabled={isLoading}
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                                {isLoginMode ? 'Enter your password' : 'Minimum 6 characters'}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {isLoginMode ? 'Logging in...' : 'Creating account...'}
                                </>
                            ) : (
                                <>
                                    {isLoginMode ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                    {isLoginMode ? 'Login' : 'Create Account'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-xs font-semibold text-blue-900 mb-2">🚀 Demo Credentials</p>
                        <p className="text-xs text-blue-700">
                            Email: <code className="bg-blue-100 px-1 rounded">demo@debtsify.com</code>
                        </p>
                        <p className="text-xs text-blue-700">
                            Password: <code className="bg-blue-100 px-1 rounded">demo123</code>
                        </p>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-neutral-500 mt-6">
                        {isLoginMode ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={() => setIsLoginMode(!isLoginMode)}
                            className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                            {isLoginMode ? 'Sign up' : 'Login'}
                        </button>
                    </p>
                </div>

                {/* Footer Note */}
                <p className="text-center text-primary-200 text-sm mt-6">
                    Secure • Professional • Reliable
                </p>
            </div>
        </div>
    );
};

export default AuthScreen;
