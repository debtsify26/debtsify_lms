import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Loan, Installment, Transaction } from '../types';
import { loansAPI, installmentsAPI, transactionsAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface DataContextType {
  loans: Loan[];
  installments: Installment[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  addLoan: (loan: Omit<Loan, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLoan: (id: string, updates: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addInstallments: (newInstallments: Omit<Installment, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
  updateInstallment: (id: string, updates: Partial<Installment>) => Promise<void>;
  deleteInstallment: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  financialSummary: any | null;
  refreshData: () => Promise<void>;
  localSummary: () => {
    marketAmount: number;
    cashInHand: number;
    totalDisbursed: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data when user logs in
  const refreshData = async () => {
    if (!isAuthenticated) {
      setLoans([]);
      setInstallments([]);
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [loansData, installmentsData, transactionsData, summaryData] = await Promise.all([
        loansAPI.getAll(),
        installmentsAPI.getAll(),
        transactionsAPI.getAll(),
        transactionsAPI.getFinancialSummary()
      ]);

      setLoans(loansData);
      setInstallments(installmentsData);
      setTransactions(transactionsData);
      setFinancialSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when auth changes
  useEffect(() => {
    refreshData();
  }, [isAuthenticated]);

  // Loans
  const addLoan = async (loanData: Omit<Loan, 'id' | 'created_at' | 'updated_at'>): Promise<any> => {
    setError(null);
    try {
      const newLoan = await loansAPI.create(loanData);
      setLoans((prev) => [...prev, newLoan]);
      await refreshData(); // Refresh summary after adding
      return newLoan;
    } catch (err: any) {
      setError(err.message || 'Failed to create loan');
      throw err;
    }
  };

  const updateLoan = async (id: string, updates: Partial<Loan>) => {
    setError(null);
    try {
      const updatedLoan = await loansAPI.update(id, updates);
      setLoans((prev) => prev.map((l) => (l.id === id ? updatedLoan : l)));
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to update loan');
      throw err;
    }
  };

  const deleteLoan = async (id: string) => {
    setError(null);
    try {
      await loansAPI.delete(id);
      setLoans((prev) => prev.filter((l) => l.id !== id));
      // Also remove related installments
      setInstallments((prev) => prev.filter((i) => i.loan_id !== id));
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete loan');
      throw err;
    }
  };

  // Installments
  const addInstallments = async (newInstallments: Omit<Installment, 'id' | 'created_at' | 'updated_at'>[]) => {
    setError(null);
    try {
      const created = await installmentsAPI.bulkCreate(newInstallments);
      setInstallments((prev) => [...prev, ...created]);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to create installments');
      throw err;
    }
  };

  const updateInstallment = async (id: string, updates: Partial<Installment>) => {
    setError(null);
    try {
      const updated = await installmentsAPI.update(id, updates);
      setInstallments((prev) => prev.map((i) => (i.id === id ? updated : i)));
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to update installment');
      throw err;
    }
  };

  const deleteInstallment = async (id: string) => {
    setError(null);
    try {
      await installmentsAPI.delete(id);
      setInstallments((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete installment');
      throw err;
    }
  };

  // Transactions
  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'created_at'>) => {
    setError(null);
    try {
      const newTransaction = await transactionsAPI.create(transactionData);
      setTransactions((prev) => [newTransaction, ...prev]); // Newest first
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to create transaction');
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    setError(null);
    try {
      await transactionsAPI.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction');
      throw err;
    }
  };

  // Local financial summary calculation
  const localSummary = () => {
    const activeLoans = loans.filter(l => l.status === 'ACTIVE');

    const marketAmount = activeLoans.reduce((sum, loan) => {
      if (loan.type === 'TOTAL_RATE' && loan.total_rate_multiplier) {
        return sum + (loan.principal_amount * loan.total_rate_multiplier);
      } else if (loan.type === 'DAILY_RATE') {
        return sum + loan.principal_amount;
      }
      return sum;
    }, 0);

    const totalCollected = installments.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0);

    const totalDisbursed = activeLoans.reduce((sum, loan) => sum + loan.principal_amount, 0);

    return {
      marketAmount,
      totalCollected,
      totalDisbursed,
    };
  };

  const value = {
    loans,
    installments,
    transactions,
    isLoading,
    error,
    addLoan,
    updateLoan,
    deleteLoan,
    addInstallments,
    updateInstallment,
    deleteInstallment,
    addTransaction,
    deleteTransaction,
    refreshData,
    localSummary,
    financialSummary,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};