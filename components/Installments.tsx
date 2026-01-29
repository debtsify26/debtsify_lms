import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Installment, InstallmentStatus, TransactionType, LoanType, LoanStatus } from '../types';
import { CheckCircle2, AlertCircle, RotateCcw, DollarSign, Calendar } from 'lucide-react';

const simpleId = () => Math.random().toString(36).substr(2, 9);

const Installments: React.FC = () => {
  const { installments, updateInstallment, addTransaction, loans, addInstallments, updateLoan, transactions } = useData();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'>('PENDING');

  const filtered = installments
    .filter(i => filter === 'ALL' ? true : i.status === filter)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const handlePay = (inst: Installment) => {
    const loan = loans.find(l => l.id === inst.loanId);
    if (!loan) return;

    // 1. Update Installment
    const updatedInst = {
      ...inst,
      status: InstallmentStatus.PAID,
      paidAmount: inst.expectedAmount + (inst.penalty || 0),
      paidDate: new Date().toISOString()
    };
    updateInstallment(updatedInst);

    // 2. Add Transaction
    const transId = simpleId();
    addTransaction({
      id: transId,
      date: new Date().toISOString(),
      amount: updatedInst.paidAmount,
      type: TransactionType.CREDIT,
      category: 'Repayment',
      description: `Payment from ${inst.clientName} (${inst.type})`,
      relatedEntityId: inst.id
    });

    // 3. Daily Rate Logic: Generate NEXT Installment or Close
    if (loan.type === LoanType.DAILY_RATE && inst.type === 'INTEREST_ONLY') {
      // Create next interest installment
      const days = loan.frequency === 'DAILY' ? 1 : loan.frequency === 'WEEKLY' ? 7 : 30;
      const nextDueDate = new Date(inst.dueDate);
      nextDueDate.setDate(nextDueDate.getDate() + days);
      
      addInstallments([{
        id: simpleId(),
        loanId: loan.id,
        clientName: loan.clientName,
        dueDate: nextDueDate.toISOString().split('T')[0],
        expectedAmount: inst.expectedAmount, // Assume same interest unless rate changes
        paidAmount: 0,
        penalty: 0,
        status: InstallmentStatus.PENDING,
        type: 'INTEREST_ONLY'
      }]);
    }
    
    // Check if Loan is Fully Paid (Total Rate)
    if (loan.type === LoanType.TOTAL_RATE) {
       // Logic to check if all installments are paid could go here
       // For now, manual closing or visual indication is sufficient
    }
  };

  const handleSettlePrincipal = (inst: Installment) => {
    if (!window.confirm("Are you sure you want to settle the FULL principal and close this loan?")) return;

    const loan = loans.find(l => l.id === inst.loanId);
    if (!loan) return;

    // Mark current interest as paid
    handlePay(inst);

    // Create Principal Settlement Transaction
    addTransaction({
       id: simpleId(),
       date: new Date().toISOString(),
       amount: loan.principalAmount,
       type: TransactionType.CREDIT,
       category: 'Principal Settlement',
       description: `Principal Settle: ${loan.clientName}`,
       relatedEntityId: loan.id
    });

    // Close Loan
    updateLoan({ ...loan, status: LoanStatus.CLOSED });
  };

  const handleRevert = (inst: Installment) => {
     if (!window.confirm("Revert this payment? This will remove the transaction record.")) return;

     // 1. Revert Installment
     const updatedInst = {
       ...inst,
       status: inst.dueDate < new Date().toISOString().split('T')[0] ? InstallmentStatus.OVERDUE : InstallmentStatus.PENDING,
       paidAmount: 0,
       paidDate: undefined
     };
     updateInstallment(updatedInst);

     // 2. Remove/Compensate Transaction (Here we just add a compensating debit for simplicity in ledger, or realistically we should delete the transaction)
     // For this mvp, let's add a correction debit
     addTransaction({
       id: simpleId(),
       date: new Date().toISOString(),
       amount: inst.paidAmount || 0,
       type: TransactionType.DEBIT,
       category: 'Correction',
       description: `Revert payment for ${inst.clientName}`,
       relatedEntityId: inst.id
     });
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <h2 className="text-2xl font-bold text-slate-800">Installment Schedule</h2>
         <div className="flex bg-slate-100 p-1 rounded-lg">
            {['ALL', 'PENDING', 'OVERDUE', 'PAID'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === f ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f}
              </button>
            ))}
         </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                   <tr>
                      <th className="px-6 py-4 font-medium">Due Date</th>
                      <th className="px-6 py-4 font-medium">Client</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium text-right">Amount</th>
                      <th className="px-6 py-4 font-medium text-center">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filtered.length === 0 ? (
                     <tr><td colSpan={6} className="p-8 text-center text-slate-400">No installments found</td></tr>
                   ) : (
                     filtered.map(inst => {
                       const isDaily = inst.type === 'INTEREST_ONLY';
                       return (
                         <tr key={inst.id} className="hover:bg-slate-50 group">
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                               <div className="flex items-center gap-2">
                                  <Calendar size={14} />
                                  {inst.dueDate}
                               </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-800">{inst.clientName}</td>
                            <td className="px-6 py-4 text-slate-500 text-xs uppercase">{inst.type.replace('_', ' ')}</td>
                            <td className="px-6 py-4 text-right font-mono font-medium">
                               ₹{(inst.expectedAmount + (inst.penalty || 0)).toLocaleString()}
                               {inst.penalty > 0 && <span className="block text-xs text-red-500">+{inst.penalty} Penalty</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                               <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                  inst.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-50 text-blue-700'
                               }`}>
                                  {inst.status === 'PAID' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                  {inst.status}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {inst.status !== 'PAID' && (
                                    <>
                                      <button 
                                        onClick={() => handlePay(inst)}
                                        className="p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                                        title="Record Payment"
                                      >
                                         <DollarSign size={16} />
                                      </button>
                                      {isDaily && (
                                         <button 
                                            onClick={() => handleSettlePrincipal(inst)}
                                            className="p-2 bg-slate-700 text-white rounded hover:bg-slate-800 transition-colors"
                                            title="Settle Principal & Close"
                                         >
                                            <CheckCircle2 size={16} />
                                         </button>
                                      )}
                                    </>
                                  )}
                                  {inst.status === 'PAID' && (
                                    <button 
                                      onClick={() => handleRevert(inst)}
                                      className="p-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                                      title="Revert Payment"
                                    >
                                       <RotateCcw size={16} />
                                    </button>
                                  )}
                               </div>
                            </td>
                         </tr>
                       );
                     })
                   )}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};

export default Installments;