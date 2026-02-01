export enum LoanType {
  TOTAL_RATE = 'TOTAL_RATE',
  DAILY_RATE = 'DAILY_RATE',
}

export enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',  // 15 days
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

// Using snake_case to match backend API response
export interface Loan {
  id: string;
  user_id?: string;
  client_name: string;
  type: LoanType | string;
  principal_amount: number;
  start_date: string;
  status: LoanStatus | string;

  // Total Rate specific
  total_rate_multiplier?: number;
  tenure?: number;

  // Daily Rate specific
  daily_rate_per_lakh?: number;
  last_interest_generation_date?: string;

  frequency: Frequency | string;
  disbursement_date: string;
  created_at?: string;

  // Legacy camelCase support
  clientId?: string;
  clientName?: string;
  principalAmount?: number;
  startDate?: string;
  totalRateMultiplier?: number;
  dailyRatePerLakh?: number;
  lastInterestGenerationDate?: string;
  disbursementDate?: string;
}

// Using snake_case to match backend API response
export interface Installment {
  id: string;
  user_id?: string;
  loan_id: string;
  client_name: string;
  due_date: string;
  expected_amount: number;
  paid_amount: number;
  penalty: number;
  status: InstallmentStatus | string;
  paid_date?: string | null;
  type: 'REGULAR' | 'INTEREST_ONLY' | 'PRINCIPAL_SETTLEMENT';
  created_at?: string;

  // Legacy camelCase support
  loanId?: string;
  clientName?: string;
  dueDate?: string;
  expectedAmount?: number;
  paidAmount?: number;
  paidDate?: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  date: string;
  amount: number;
  type: TransactionType | string;
  category: string;
  description: string;
  related_entity_id?: string;
  created_at?: string;

  // Legacy camelCase support
  relatedEntityId?: string;
}

export type View = 'DASHBOARD' | 'LOANS' | 'INSTALLMENTS' | 'LEDGER' | 'AI_ANALYST' | 'INVESTMENT_ANALYTICS';