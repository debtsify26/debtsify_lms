import { GoogleGenAI } from "@google/genai";
import { Loan, Installment, Transaction } from '../types';

// Initialize Gemini Client
// In a real app, ensure process.env.API_KEY is available. 
// We handle the case where it might be missing gracefully in the UI.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeBusinessData = async (
  query: string,
  contextData: {
    loans: Loan[];
    installments: Installment[];
    transactions: Transaction[];
  }
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key is missing. Please configure the environment variable.";
  }

  // Summarize data to save tokens and provide relevant context
  const activeLoans = contextData.loans.filter(l => l.status === 'ACTIVE');
  const overdueInstallments = contextData.installments.filter(i => i.status === 'OVERDUE');
  const cashInHand = contextData.transactions.reduce((acc, t) => t.type === 'CREDIT' ? acc + t.amount : acc - t.amount, 0);
  
  const summary = {
    totalLoans: contextData.loans.length,
    activeLoansCount: activeLoans.length,
    activeLoansValue: activeLoans.reduce((sum, l) => sum + l.principalAmount, 0),
    overdueCount: overdueInstallments.length,
    overdueValue: overdueInstallments.reduce((sum, i) => sum + (i.expectedAmount - i.paidAmount), 0),
    cashInHand: cashInHand,
    recentTransactions: contextData.transactions.slice(0, 10), // Last 10 transactions
    sampleLoans: activeLoans.slice(0, 5), // Sample of active loans
  };

  const systemInstruction = `
    You are an expert financial analyst for a small lending business called "Debtsify".
    Your goal is to provide insights, answer questions about profitability, risk, and cash flow.
    
    Here is the current business snapshot:
    ${JSON.stringify(summary, null, 2)}
    
    The user will ask questions about this data. 
    Be concise, professional, and encouraging. 
    If calculations are needed, explain your reasoning briefly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error analyzing your data. Please try again later.";
  }
};