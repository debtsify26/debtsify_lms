// API Service for communicating with FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Auth token management
export const getAuthToken = (): string | null => {
    return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string): void => {
    localStorage.setItem('auth_token', token);
};

export const removeAuthToken = (): void => {
    localStorage.removeItem('auth_token');
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        cache: 'no-store', // Prevent caching
        headers: {
            ...headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
    });

    if (response.status === 401) {
        removeAuthToken();
        window.location.href = '/';
        throw new Error('Unauthorized');
    }

    return response;
};

// Authentication API
export const authAPI = {
    signup: async (email: string, password: string, fullName: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Signup failed');
        }

        const data = await response.json();
        setAuthToken(data.access_token);
        return data;
    },

    login: async (email: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        setAuthToken(data.access_token);
        return data;
    },

    getCurrentUser: async () => {
        const response = await fetchWithAuth('/auth/me');

        if (!response.ok) {
            throw new Error('Failed to get user');
        }

        return response.json();
    },

    logout: async () => {
        try {
            await fetchWithAuth('/auth/logout', { method: 'POST' });
        } finally {
            removeAuthToken();
        }
    },

    forgotPassword: async (email: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send reset email');
        }

        return response.json();
    },

    resetPassword: async (newPassword: string, accessToken: string, refreshToken: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                new_password: newPassword,
                access_token: accessToken,
                refresh_token: refreshToken
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Password reset failed');
        }

        return response.json();
    },
};

// Loans API
export const loansAPI = {
    getAll: async (status?: string) => {
        const url = status ? `/loans?status=${status}` : '/loans';
        const response = await fetchWithAuth(url);

        if (!response.ok) {
            throw new Error('Failed to fetch loans');
        }

        return response.json();
    },

    getById: async (id: string) => {
        const response = await fetchWithAuth(`/loans/${id}`);

        if (!response.ok) {
            throw new Error('Failed to fetch loan');
        }

        return response.json();
    },

    create: async (loanData: any) => {
        const response = await fetchWithAuth('/loans', {
            method: 'POST',
            body: JSON.stringify(loanData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create loan');
        }

        return response.json();
    },

    update: async (id: string, updates: any) => {
        const response = await fetchWithAuth(`/loans/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error('Failed to update loan');
        }

        return response.json();
    },

    delete: async (id: string) => {
        const response = await fetchWithAuth(`/loans/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete loan');
        }
    },
};

// Installments API
export const installmentsAPI = {
    getAll: async (loanId?: string, status?: string) => {
        let url = '/installments?';
        if (loanId) url += `loan_id=${loanId}&`;
        if (status) url += `status=${status}`;

        const response = await fetchWithAuth(url);

        if (!response.ok) {
            throw new Error('Failed to fetch installments');
        }

        return response.json();
    },

    getById: async (id: string) => {
        const response = await fetchWithAuth(`/installments/${id}`);

        if (!response.ok) {
            throw new Error('Failed to fetch installment');
        }

        return response.json();
    },

    create: async (installmentData: any) => {
        const response = await fetchWithAuth('/installments', {
            method: 'POST',
            body: JSON.stringify(installmentData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create installment');
        }

        return response.json();
    },

    bulkCreate: async (installments: any[]) => {
        const response = await fetchWithAuth('/installments/bulk', {
            method: 'POST',
            body: JSON.stringify(installments),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create installments');
        }

        return response.json();
    },

    update: async (id: string, updates: any) => {
        const response = await fetchWithAuth(`/installments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to update installment');
        }

        return response.json();
    },

    delete: async (id: string) => {
        const response = await fetchWithAuth(`/installments/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete installment');
        }
    },

    syncLoanStatuses: async () => {
        const response = await fetchWithAuth('/installments/sync-loan-statuses', {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Failed to sync loan statuses');
        }

        return response.json();
    },
};

// Transactions API
export const transactionsAPI = {
    getAll: async (type?: string) => {
        const url = type ? `/transactions?type=${type}` : '/transactions';
        const response = await fetchWithAuth(url);

        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }

        return response.json();
    },

    getById: async (id: string) => {
        const response = await fetchWithAuth(`/transactions/${id}`);

        if (!response.ok) {
            throw new Error('Failed to fetch transaction');
        }

        return response.json();
    },

    create: async (transactionData: any) => {
        const response = await fetchWithAuth('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create transaction');
        }

        return response.json();
    },

    delete: async (id: string) => {
        const response = await fetchWithAuth(`/transactions/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete transaction');
        }
    },

    getFinancialSummary: async () => {
        const response = await fetchWithAuth('/transactions/summary/financial');

        if (!response.ok) {
            throw new Error('Failed to fetch financial summary');
        }

        return response.json();
    },
};

// Health check
export const healthCheck = async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
};

// Sync API
export const syncAPI = {
    syncData: async (createArchive: boolean = false) => {
        const url = createArchive ? '/sync?create_archive=true' : '/sync';
        const response = await fetchWithAuth(url, {
            method: 'POST',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Sync failed');
        }

        return response.json();
    },
};
