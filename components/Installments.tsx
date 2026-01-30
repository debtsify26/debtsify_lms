import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { LoanType, Frequency } from '../types';
import { CheckCircle2, AlertCircle, RotateCcw, DollarSign, Calendar, Loader2, Download, Pencil } from 'lucide-react';

const Installments: React.FC = () => {
   const { installments, updateInstallment, addTransaction, loans, addInstallments, updateLoan, isLoading } = useData();
   const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'>('PENDING');
   const [actionLoading, setActionLoading] = useState<string | null>(null);
   const [editModal, setEditModal] = useState<any>(null);
   const [editPenalty, setEditPenalty] = useState(0);

   // Get days based on frequency
   const getFrequencyDays = (freq: string): number => {
      switch (freq) {
         case 'DAILY': return 1;
         case 'WEEKLY': return 7;
         case 'BIWEEKLY': return 15;
         case 'MONTHLY': return 30;
         default: return 7;
      }
   };

   const filtered = installments
      .filter(i => filter === 'ALL' ? true : i.status === filter)
      .sort((a, b) => new Date(a.due_date || a.dueDate).getTime() - new Date(b.due_date || b.dueDate).getTime());

   const handlePay = async (inst: any) => {
      const loan = loans.find(l => l.id === (inst.loan_id || inst.loanId));
      if (!loan) {
         alert('Associated loan not found!');
         return;
      }

      setActionLoading(inst.id);
      try {
         const expectedAmount = inst.expected_amount || inst.expectedAmount;
         const penalty = inst.penalty || 0;
         const totalAmount = expectedAmount + penalty;

         // 1. Update Installment
         await updateInstallment(inst.id, {
            status: 'PAID',
            paid_amount: totalAmount,
            paid_date: new Date().toISOString().split('T')[0]
         });

         // 2. Add Transaction
         await addTransaction({
            date: new Date().toISOString(),
            amount: totalAmount,
            type: 'CREDIT',
            category: 'Repayment',
            description: `Payment from ${inst.client_name || inst.clientName} (${inst.type})`
         });

         // 3. Daily Rate Logic: Generate NEXT Installment
         if ((loan.type === 'DAILY_RATE' || loan.type === LoanType.DAILY_RATE) && inst.type === 'INTEREST_ONLY') {
            const days = getFrequencyDays(loan.frequency);
            const nextDueDate = new Date(inst.due_date || inst.dueDate);
            nextDueDate.setDate(nextDueDate.getDate() + days);

            await addInstallments([{
               loan_id: loan.id,
               client_name: loan.client_name || loan.clientName,
               due_date: nextDueDate.toISOString().split('T')[0],
               expected_amount: expectedAmount,
               paid_amount: 0,
               penalty: 0,
               status: 'PENDING',
               type: 'INTEREST_ONLY'
            }]);
         }
      } catch (error: any) {
         alert(`Error: ${error.message}`);
      } finally {
         setActionLoading(null);
      }
   };

   const handleSettlePrincipal = async (inst: any) => {
      if (!window.confirm("Are you sure you want to settle the FULL principal and close this loan?")) return;

      const loan = loans.find(l => l.id === (inst.loan_id || inst.loanId));
      if (!loan) return;

      setActionLoading(inst.id);
      try {
         const expectedAmount = inst.expected_amount || inst.expectedAmount;
         const penalty = inst.penalty || 0;

         // Mark current interest as paid
         await updateInstallment(inst.id, {
            status: 'PAID',
            paid_amount: expectedAmount + penalty,
            paid_date: new Date().toISOString().split('T')[0]
         });

         // Add interest payment transaction
         await addTransaction({
            date: new Date().toISOString(),
            amount: expectedAmount + penalty,
            type: 'CREDIT',
            category: 'Interest Payment',
            description: `Interest from ${loan.client_name || loan.clientName}`
         });

         // Create Principal Settlement Transaction
         const principalAmount = loan.principal_amount || loan.principalAmount;
         await addTransaction({
            date: new Date().toISOString(),
            amount: principalAmount,
            type: 'CREDIT',
            category: 'Principal Settlement',
            description: `Principal Settle: ${loan.client_name || loan.clientName}`
         });

         // Close Loan
         await updateLoan(loan.id, { status: 'CLOSED' });

         alert('Loan closed successfully!');
      } catch (error: any) {
         alert(`Error: ${error.message}`);
      } finally {
         setActionLoading(null);
      }
   };

   const handleRevert = async (inst: any) => {
      if (!window.confirm("Revert this payment? This will add a correction transaction.")) return;

      setActionLoading(inst.id);
      try {
         const dueDate = inst.due_date || inst.dueDate;
         const today = new Date().toISOString().split('T')[0];
         const newStatus = dueDate < today ? 'OVERDUE' : 'PENDING';
         const paidAmount = inst.paid_amount || inst.paidAmount || 0;

         // 1. Revert Installment
         await updateInstallment(inst.id, {
            status: newStatus,
            paid_amount: 0,
            paid_date: null
         });

         // 2. Add correction debit
         if (paidAmount > 0) {
            await addTransaction({
               date: new Date().toISOString(),
               amount: paidAmount,
               type: 'DEBIT',
               category: 'Correction',
               description: `Revert payment for ${inst.client_name || inst.clientName}`
            });
         }

         alert('Payment reverted successfully!');
      } catch (error: any) {
         alert(`Error: ${error.message}`);
      } finally {
         setActionLoading(null);
      }
   };

   const handleEditPenalty = async () => {
      if (!editModal) return;

      setActionLoading(editModal.id);
      try {
         await updateInstallment(editModal.id, {
            penalty: Number(editPenalty)
         });
         setEditModal(null);
         alert('Penalty updated successfully!');
      } catch (error: any) {
         alert(`Error updating penalty: ${error.message}`);
      } finally {
         setActionLoading(null);
      }
   };

   // Export to Excel (CSV format)
   const exportToExcel = () => {
      const headers = ['ID', 'Client Name', 'Due Date', 'Type', 'Expected Amount', 'Paid Amount', 'Penalty', 'Status', 'Paid Date'];
      const rows = installments.map(inst => {
         const clientName = inst.client_name || inst.clientName;
         const dueDate = inst.due_date || inst.dueDate;
         const expectedAmount = inst.expected_amount || inst.expectedAmount;
         const paidAmount = inst.paid_amount || inst.paidAmount || 0;
         const paidDate = inst.paid_date || inst.paidDate || '-';

         return [
            inst.id,
            clientName,
            dueDate,
            inst.type,
            expectedAmount,
            paidAmount,
            inst.penalty || 0,
            inst.status,
            paidDate
         ];
      });

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `installments_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      URL.revokeObjectURL(url);
   };

   if (isLoading) {
      return (
         <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Installment Schedule</h2>
            <div className="flex gap-2 items-center">
               <button
                  onClick={exportToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
               >
                  <Download size={18} /> Export
               </button>
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
                           const dueDate = inst.due_date || inst.dueDate;
                           const clientName = inst.client_name || inst.clientName;
                           const expectedAmount = inst.expected_amount || inst.expectedAmount;
                           const penalty = inst.penalty || 0;
                           const isThisLoading = actionLoading === inst.id;

                           return (
                              <tr key={inst.id} className="hover:bg-slate-50 group">
                                 <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                       <Calendar size={14} />
                                       {dueDate}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 font-medium text-slate-800">{clientName}</td>
                                 <td className="px-6 py-4 text-slate-500 text-xs uppercase">{inst.type?.replace('_', ' ')}</td>
                                 <td className="px-6 py-4 text-right font-mono font-medium">
                                    ₹{(expectedAmount + penalty).toLocaleString()}
                                    {penalty > 0 && <span className="block text-xs text-red-500">+{penalty.toLocaleString()} Penalty</span>}
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                          inst.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                             'bg-blue-50 text-blue-700'
                                       }`}>
                                       {inst.status === 'PAID' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                       {inst.status}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       {isThisLoading ? (
                                          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                                       ) : (
                                          <>
                                             {inst.status !== 'PAID' && (
                                                <>
                                                   <button
                                                      onClick={() => { setEditModal(inst); setEditPenalty(penalty); }}
                                                      className="p-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                                                      title="Edit Penalty"
                                                   >
                                                      <Pencil size={16} />
                                                   </button>
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
                                          </>
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

         {/* Edit Penalty Modal */}
         {editModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Installment</h3>
                  <div className="space-y-4">
                     <div>
                        <p className="text-sm text-slate-500">Client: <span className="font-medium text-slate-700">{editModal.client_name || editModal.clientName}</span></p>
                        <p className="text-sm text-slate-500">Due Date: <span className="font-medium text-slate-700">{editModal.due_date || editModal.dueDate}</span></p>
                        <p className="text-sm text-slate-500">Expected: <span className="font-medium text-slate-700">₹{(editModal.expected_amount || editModal.expectedAmount)?.toLocaleString()}</span></p>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Penalty Amount (₹)</label>
                        <input
                           type="number"
                           className="w-full border p-2 rounded-lg"
                           value={editPenalty}
                           onChange={e => setEditPenalty(Number(e.target.value))}
                           min={0}
                        />
                     </div>
                     <div className="flex gap-2 pt-2">
                        <button
                           onClick={() => setEditModal(null)}
                           className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleEditPenalty}
                           className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                           disabled={actionLoading === editModal.id}
                        >
                           {actionLoading === editModal.id ? 'Saving...' : 'Save'}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Installments;