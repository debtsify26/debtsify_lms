export enum LoanType {
  TOTAL_RATE = 'TOTAL_RATE',
  DAILY_RATE = 'DAILY_RATE',
}

export enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  BAD_DEBT = 'BAD_DEBT',
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum TransactionType {
  CREDIT = 'CREDIT', // Money coming in (Payment)
  DEBIT = 'DEBIT',   // Money going out (Disbursement, Expense)
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface Loan {
  id: string;
  clientId: string;
  clientName: string; // Denormalized for easier display
  type: LoanType;
  principalAmount: number;
  startDate: string; // ISO Date string YYYY-MM-DD
  status: LoanStatus;
  
  // Total Rate specific
  totalRateMultiplier?: number; // e.g. 1.2
  tenure?: number; // count of installments
  
  // Daily Rate specific
  dailyRatePerLakh?: number; // e.g. 100 per 1L per day
  lastInterestGenerationDate?: string;
  
  frequency: Frequency;
  disbursementDate: string;
}

export interface Installment {
  id: string;
  loanId: string;
  clientName: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  penalty: number;
  status: InstallmentStatus;
  paidDate?: string;
  type: 'REGULAR' | 'INTEREST_ONLY' | 'PRINCIPAL_SETTLEMENT';
}

export interface Transaction {
  id: string;
  date: string; // ISO DateTime
  amount: number;
  type: TransactionType;
  category: string; // e.g., "Loan Repayment", "New Loan", "Expense"
  description: string;
  relatedEntityId?: string; // Loan ID or Installment ID
}

export type View = 'DASHBOARD' | 'LOANS' | 'INSTALLMENTS' | 'LEDGER' | 'AI_ANALYST';