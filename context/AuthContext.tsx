import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, getAuthToken } from '../services/api';

interface User {
    id: string;
    email: string;
    full_name: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if user is already logged in on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getAuthToken();

            if (token) {
                try {
                    const userData = await authAPI.getCurrentUser();
                    setUser(userData);
                } catch (err) {
                    console.error('Failed to get current user:', err);
                    // Token might be invalid, will show login screen
                }
            }

            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        setError(null);
        setIsLoading(true);

        try {
            await authAPI.login(email, password);
            const userData = await authAPI.getCurrentUser();
            setUser(userData);
        } catch (err: any) {
            setError(err.message || 'Login failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (email: string, password: string, fullName: string) => {
        setError(null);
        setIsLoading(true);

        try {
            await authAPI.signup(email, password, fullName);
            const userData = await authAPI.getCurrentUser();
            setUser(userData);
        } catch (err: any) {
            setError(err.message || 'Signup failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);

        try {
            await authAPI.logout();
            setUser(null);
        } catch (err) {
            console.error('Logout error:', err);
            // Still clear user even if API call fails
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        error,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
