import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';

const AuthScreen: React.FC = () => {
    const { login, signup, forgotPassword, error, isLoading } = useAuth();
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [localError, setLocalError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!email) {
            setLocalError('Email is required');
            return;
        }

        if (mode !== 'FORGOT_PASSWORD' && !password) {
            setLocalError('Password is required');
            return;
        }

        if (mode === 'SIGNUP' && !fullName) {
            setLocalError('Full name is required for signup');
            return;
        }

        if (mode !== 'FORGOT_PASSWORD' && password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        try {
            if (mode === 'LOGIN') {
                await login(email, password);
            } else if (mode === 'SIGNUP') {
                await signup(email, password, fullName);
            } else {
                await forgotPassword(email);
                setSuccessMessage('Password reset email sent! Check your inbox.');
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
                            onClick={() => { setMode('LOGIN'); setSuccessMessage(''); setLocalError(''); }}
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${mode === 'LOGIN' || mode === 'FORGOT_PASSWORD'
                                ? 'bg-white text-primary-700 shadow-md'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            <LogIn className="w-4 h-4 inline-block mr-2" />
                            Login
                        </button>
                        <button
                            onClick={() => { setMode('SIGNUP'); setSuccessMessage(''); setLocalError(''); }}
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${mode === 'SIGNUP'
                                ? 'bg-white text-primary-700 shadow-md'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            <UserPlus className="w-4 h-4 inline-block mr-2" />
                            Sign Up
                        </button>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-700">{successMessage}</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{errorMessage}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'SIGNUP' && (
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
                                required
                            />
                        </div>

                        {mode !== 'FORGOT_PASSWORD' && (
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="block text-sm font-medium text-neutral-700">
                                        Password
                                    </label>
                                    {mode === 'LOGIN' && (
                                        <button
                                            type="button"
                                            onClick={() => { setMode('FORGOT_PASSWORD'); setLocalError(''); setSuccessMessage(''); }}
                                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    disabled={isLoading}
                                    required
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    {mode === 'LOGIN' ? 'Enter your password' : 'Minimum 6 characters'}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {mode === 'LOGIN' ? 'Logging in...' : mode === 'SIGNUP' ? 'Creating account...' : 'Sending email...'}
                                </>
                            ) : (
                                <>
                                    {mode === 'LOGIN' ? <LogIn className="w-5 h-5" /> : mode === 'SIGNUP' ? <UserPlus className="w-5 h-5" /> : null}
                                    {mode === 'LOGIN' ? 'Login' : mode === 'SIGNUP' ? 'Create Account' : 'Send Reset Email'}
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
                        {mode === 'LOGIN' ? "Don't have an account? " : mode === 'SIGNUP' ? 'Already have an account? ' : 'Back to '}
                        <button
                            onClick={() => { setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN'); setSuccessMessage(''); setLocalError(''); }}
                            className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                            {mode === 'LOGIN' ? 'Sign up' : 'Login'}
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
