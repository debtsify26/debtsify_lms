import React, { createContext, useContext, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Loan, Installment, Transaction, LoanStatus, TransactionType } from '../types';

interface DataContextType {
  loans: Loan[];
  installments: Installment[];
  transactions: Transaction[];
  addLoan: (loan: Loan) => void;
  updateLoan: (loan: Loan) => void;
  addInstallments: (newInstallments: Installment[]) => void;
  updateInstallment: (installment: Installment) => void;
  addTransaction: (transaction: Transaction) => void;
  resetData: () => void;
  getFinancialSummary: () => {
    marketAmount: number;
    cashInHand: number;
    totalDisbursed: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loans, setLoans] = useLocalStorage<Loan[]>('debtsify_loans', []);
  const [installments, setInstallments] = useLocalStorage<Installment[]>('debtsify_installments', []);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('debtsify_transactions', []);

  const addLoan = (loan: Loan) => {
    setLoans((prev) => [...prev, loan]);
  };

  const updateLoan = (updatedLoan: Loan) => {
    setLoans((prev) => prev.map((l) => (l.id === updatedLoan.id ? updatedLoan : l)));
  };

  const addInstallments = (newInstallments: Installment[]) => {
    setInstallments((prev) => [...prev, ...newInstallments]);
  };

  const updateInstallment = (updatedInstallment: Installment) => {
    setInstallments((prev) => prev.map((i) => (i.id === updatedInstallment.id ? updatedInstallment : i)));
  };

  const addTransaction = (transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev]); // Newest first
  };

  const resetData = () => {
    setLoans([]);
    setInstallments([]);
    setTransactions([]);
  };

  const getFinancialSummary = () => {
    // Market Amount: Principal of active daily loans + Unpaid expected amount of all installments
    let marketAmount = 0;
    
    // 1. Add outstanding installments
    installments.forEach(inst => {
      if (inst.status !== 'PAID') {
         marketAmount += (inst.expectedAmount - inst.paidAmount);
      }
    });

    // 2. Add Principal for Daily Rate loans (since installments only cover interest)
    loans.forEach(loan => {
      if (loan.type === 'DAILY_RATE' && loan.status === 'ACTIVE') {
        marketAmount += loan.principalAmount;
      }
    });

    // Cash In Hand: Transactions Sum
    const cashInHand = transactions.reduce((acc, t) => {
      return t.type === TransactionType.CREDIT ? acc + t.amount : acc - t.amount;
    }, 0);

    // Total Disbursed: Sum of principal of all loans
    const totalDisbursed = loans.reduce((acc, l) => acc + l.principalAmount, 0);

    return { marketAmount, cashInHand, totalDisbursed };
  };

  return (
    <DataContext.Provider
      value={{
        loans,
        installments,
        transactions,
        addLoan,
        updateLoan,
        addInstallments,
        updateInstallment,
        addTransaction,
        resetData,
        getFinancialSummary
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};