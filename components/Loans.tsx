import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Loan, LoanType, Frequency, LoanStatus, InstallmentStatus, Installment, TransactionType } from '../types';
import { Plus, Search, Filter } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Since we can't install packages, we'll implement a simple ID gen function below

const simpleId = () => Math.random().toString(36).substr(2, 9);

const Loans: React.FC = () => {
  const { loans, addLoan, addInstallments, addTransaction } = useData();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>(LoanType.TOTAL_RATE);
  const [principal, setPrincipal] = useState(10000);
  const [frequency, setFrequency] = useState<Frequency>(Frequency.WEEKLY);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Total Rate Specific
  const [multiplier, setMultiplier] = useState(1.2);
  const [tenure, setTenure] = useState(10);
  
  // Daily Rate Specific
  const [dailyRate, setDailyRate] = useState(100);

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const loanId = simpleId();

    const newLoan: Loan = {
      id: loanId,
      clientId: simpleId(), // In a real app, we'd select an existing client
      clientName,
      type: loanType,
      principalAmount: Number(principal),
      startDate,
      status: LoanStatus.ACTIVE,
      frequency,
      disbursementDate: startDate,
      ...(loanType === LoanType.TOTAL_RATE ? { totalRateMultiplier: Number(multiplier), tenure: Number(tenure) } : {}),
      ...(loanType === LoanType.DAILY_RATE ? { dailyRatePerLakh: Number(dailyRate) } : {}),
    };

    // Generate Installments
    const newInstallments: Installment[] = [];
    const start = new Date(startDate);

    if (loanType === LoanType.TOTAL_RATE) {
      const totalAmount = newLoan.principalAmount * (newLoan.totalRateMultiplier || 1);
      const installmentAmount = Math.ceil(totalAmount / (newLoan.tenure || 1));

      for (let i = 1; i <= (newLoan.tenure || 1); i++) {
        const dueDate = new Date(start);
        if (frequency === Frequency.DAILY) dueDate.setDate(start.getDate() + i);
        if (frequency === Frequency.WEEKLY) dueDate.setDate(start.getDate() + (i * 7));
        if (frequency === Frequency.MONTHLY) dueDate.setMonth(start.getMonth() + i);

        newInstallments.push({
          id: simpleId(),
          loanId: loanId,
          clientName: clientName,
          dueDate: dueDate.toISOString().split('T')[0],
          expectedAmount: installmentAmount,
          paidAmount: 0,
          penalty: 0,
          status: InstallmentStatus.PENDING,
          type: 'REGULAR'
        });
      }
    } else {
      // Daily Rate: Generate FIRST interest installment only.
      // Logic: If weekly frequency, calculate 7 days interest.
      // Interest = (Principal / 1L) * Rate * Days
      const days = frequency === Frequency.DAILY ? 1 : frequency === Frequency.WEEKLY ? 7 : 30;
      const interestAmount = Math.ceil((newLoan.principalAmount / 100000) * (newLoan.dailyRatePerLakh || 0) * days);
      
      const dueDate = new Date(start);
      dueDate.setDate(start.getDate() + days);

      newInstallments.push({
        id: simpleId(),
        loanId: loanId,
        clientName: clientName,
        dueDate: dueDate.toISOString().split('T')[0],
        expectedAmount: interestAmount,
        paidAmount: 0,
        penalty: 0,
        status: InstallmentStatus.PENDING,
        type: 'INTEREST_ONLY'
      });
    }

    // Add Transaction for Disbursement
    addTransaction({
      id: simpleId(),
      date: new Date().toISOString(),
      amount: newLoan.principalAmount,
      type: TransactionType.DEBIT,
      category: 'Loan Disbursement',
      description: `Disbursed to ${clientName}`,
      relatedEntityId: loanId
    });

    addLoan(newLoan);
    addInstallments(newInstallments);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setClientName('');
    setPrincipal(10000);
    setMultiplier(1.2);
    setTenure(10);
    setDailyRate(100);
  };

  const filteredLoans = loans.filter(l => 
    l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.id.includes(searchTerm)
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Loan Accounts</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> New Loan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search loans by client name or ID..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLoans.map(loan => (
          <div key={loan.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
             {loan.status === 'ACTIVE' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
             {loan.status === 'CLOSED' && <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>}
             
             <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{loan.clientName}</h3>
                  <span className="text-xs text-slate-500 font-mono">#{loan.id.substring(0, 6)}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {loan.status}
                </span>
             </div>
             
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                   <span className="text-slate-500">Principal</span>
                   <span className="font-medium">₹{loan.principalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-slate-500">Type</span>
                   <span className="font-medium text-slate-700">{loan.type === 'TOTAL_RATE' ? 'Total Rate' : 'Daily Rate'}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-slate-500">Frequency</span>
                   <span className="font-medium text-slate-700">{loan.frequency}</span>
                </div>
                {loan.type === 'TOTAL_RATE' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenure</span>
                    <span className="font-medium text-slate-700">{loan.tenure} Inst.</span>
                  </div>
                )}
                 {loan.type === 'DAILY_RATE' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rate</span>
                    <span className="font-medium text-slate-700">₹{loan.dailyRatePerLakh}/L/Day</span>
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>

      {/* New Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Create New Loan</h3>
            <form onSubmit={handleCreateLoan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
                <input required type="text" className="w-full border p-2 rounded-lg" value={clientName} onChange={e => setClientName(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select className="w-full border p-2 rounded-lg" value={loanType} onChange={e => setLoanType(e.target.value as LoanType)}>
                    <option value={LoanType.TOTAL_RATE}>Total Rate (Fixed)</option>
                    <option value={LoanType.DAILY_RATE}>Daily Rate (Recurring)</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Principal (₹)</label>
                   <input required type="number" className="w-full border p-2 rounded-lg" value={principal} onChange={e => setPrincipal(Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input required type="date" className="w-full border p-2 rounded-lg" value={startDate} onChange={e => setStartDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                    <select className="w-full border p-2 rounded-lg" value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
                      <option value={Frequency.DAILY}>Daily</option>
                      <option value={Frequency.WEEKLY}>Weekly</option>
                      <option value={Frequency.MONTHLY}>Monthly</option>
                    </select>
                 </div>
              </div>

              {loanType === LoanType.TOTAL_RATE ? (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                   <h4 className="text-sm font-bold text-slate-600">Total Rate Config</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Multiplier (e.g. 1.2)</label>
                        <input type="number" step="0.1" className="w-full border p-2 rounded-lg" value={multiplier} onChange={e => setMultiplier(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Tenure (Installments)</label>
                        <input type="number" className="w-full border p-2 rounded-lg" value={tenure} onChange={e => setTenure(Number(e.target.value))} />
                      </div>
                   </div>
                   <div className="text-xs text-slate-500 mt-2">
                     Total Repayment: <span className="font-bold text-primary-600">₹{Math.ceil(principal * multiplier)}</span>
                     <br />
                     Per Installment: <span className="font-bold text-primary-600">₹{Math.ceil((principal * multiplier) / tenure)}</span>
                   </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="text-sm font-bold text-slate-600">Daily Rate Config</h4>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Rate per ₹1 Lakh / Day</label>
                    <input type="number" className="w-full border p-2 rounded-lg" value={dailyRate} onChange={e => setDailyRate(Number(e.target.value))} />
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                     Est. Interest (per freq): <span className="font-bold text-primary-600">
                       ₹{Math.ceil((principal / 100000) * dailyRate * (frequency === 'WEEKLY' ? 7 : frequency === 'MONTHLY' ? 30 : 1))}
                     </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">Create Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;