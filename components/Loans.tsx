import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { LoanType, Frequency, LoanStatus } from '../types';
import { Plus, Search, Loader2, Pencil, Trash2, Download, X } from 'lucide-react';

const Loans: React.FC = () => {
  const { loans, addLoan, updateLoan, deleteLoan, addInstallments, addTransaction, isLoading } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Get days based on frequency
  const getFrequencyDays = (freq: Frequency | string): number => {
    switch (freq) {
      case Frequency.DAILY:
      case 'DAILY': return 1;
      case Frequency.WEEKLY:
      case 'WEEKLY': return 7;
      case Frequency.BIWEEKLY:
      case 'BIWEEKLY': return 15;
      case Frequency.MONTHLY:
      case 'MONTHLY': return 30;
      default: return 7;
    }
  };

  const openEditModal = (loan: any) => {
    setEditingLoan(loan);
    setClientName(loan.client_name || loan.clientName);
    setLoanType(loan.type);
    setPrincipal(loan.principal_amount || loan.principalAmount);
    setFrequency(loan.frequency);
    setStartDate(loan.start_date || loan.startDate);
    setMultiplier(loan.total_rate_multiplier || loan.totalRateMultiplier || 1.2);
    setTenure(loan.tenure || 10);
    setDailyRate(loan.daily_rate_per_lakh || loan.dailyRatePerLakh || 100);
    setShowModal(true);
  };

  const handleDeleteLoan = async (loanId: string, clientName: string) => {
    if (!window.confirm(`Are you sure you want to delete the loan for "${clientName}"? This will also delete all associated installments.`)) {
      return;
    }

    try {
      await deleteLoan(loanId);
      alert('Loan deleted successfully!');
    } catch (error: any) {
      alert(`Error deleting loan: ${error.message}`);
    }
  };

  const handleCreateOrUpdateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const loanData: any = {
        client_name: clientName,
        type: loanType,
        principal_amount: Number(principal),
        start_date: startDate,
        status: 'ACTIVE',
        frequency: frequency,
        disbursement_date: startDate,
      };

      if (loanType === LoanType.TOTAL_RATE) {
        loanData.total_rate_multiplier = Number(multiplier);
        loanData.tenure = Number(tenure);
      } else {
        loanData.daily_rate_per_lakh = Number(dailyRate);
      }

      if (editingLoan) {
        // Update existing loan
        await updateLoan(editingLoan.id, loanData);
        alert('Loan updated successfully!');
      } else {
        // Create new loan
        const createdLoan = await addLoan(loanData);
        const loanId = createdLoan.id;

        // Add Transaction for Disbursement
        await addTransaction({
          date: new Date().toISOString(),
          amount: Number(principal),
          type: 'DEBIT',
          category: 'Loan Disbursement',
          description: `Disbursed to ${clientName}`
        });

        // Create installments
        const newInstallments: any[] = [];
        const start = new Date(startDate);
        const days = getFrequencyDays(frequency);

        if (loanType === LoanType.TOTAL_RATE) {
          const totalAmount = Number(principal) * Number(multiplier);
          const installmentAmount = Math.ceil(totalAmount / Number(tenure));

          for (let i = 1; i <= Number(tenure); i++) {
            const dueDate = new Date(start);
            dueDate.setDate(start.getDate() + (i * days));

            newInstallments.push({
              loan_id: loanId,
              client_name: clientName,
              due_date: dueDate.toISOString().split('T')[0],
              expected_amount: installmentAmount,
              paid_amount: 0,
              penalty: 0,
              status: 'PENDING',
              type: 'REGULAR'
            });
          }
        } else {
          // Daily Rate: Generate FIRST interest installment only
          const interestAmount = Math.ceil((Number(principal) / 100000) * Number(dailyRate) * days);

          const dueDate = new Date(start);
          dueDate.setDate(start.getDate() + days);

          newInstallments.push({
            loan_id: loanId,
            client_name: clientName,
            due_date: dueDate.toISOString().split('T')[0],
            expected_amount: interestAmount,
            paid_amount: 0,
            penalty: 0,
            status: 'PENDING',
            type: 'INTEREST_ONLY'
          });
        }

        if (newInstallments.length > 0) {
          await addInstallments(newInstallments);
        }
      }

      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setPrincipal(10000);
    setMultiplier(1.2);
    setTenure(10);
    setDailyRate(100);
    setEditingLoan(null);
  };

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    const headers = ['ID', 'Client Name', 'Type', 'Principal', 'Frequency', 'Status', 'Start Date', 'Multiplier/Rate', 'Tenure'];
    const rows = loans.map(loan => {
      const clientName = loan.client_name || loan.clientName;
      const principalAmt = loan.principal_amount || loan.principalAmount;
      const rateOrMultiplier = loan.type === 'TOTAL_RATE'
        ? (loan.total_rate_multiplier || loan.totalRateMultiplier || '-')
        : (loan.daily_rate_per_lakh || loan.dailyRatePerLakh || '-');

      return [
        loan.id,
        clientName,
        loan.type,
        principalAmt,
        loan.frequency,
        loan.status,
        loan.start_date || loan.startDate,
        rateOrMultiplier,
        loan.tenure || '-'
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `loans_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const filteredLoans = loans.filter(l => {
    const name = l.client_name || l.clientName || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.id.includes(searchTerm);
  });

  const days = getFrequencyDays(frequency);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Loan Accounts</h2>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
          >
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
          >
            <Plus size={18} /> New Loan
          </button>
        </div>
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

      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <p className="text-slate-400">No loans yet. Click "New Loan" to create your first loan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoans.map(loan => {
            const clientName = loan.client_name || loan.clientName;
            const principalAmount = loan.principal_amount || loan.principalAmount;
            const loanType = loan.type;
            const loanFrequency = loan.frequency;
            const loanTenure = loan.tenure;
            const dailyRatePerLakh = loan.daily_rate_per_lakh || loan.dailyRatePerLakh;

            return (
              <div key={loan.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                {loan.status === 'ACTIVE' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                {loan.status === 'CLOSED' && <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>}

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{clientName}</h3>
                    <span className="text-xs text-slate-500 font-mono">#{loan.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {loan.status}
                    </span>
                    <button
                      onClick={() => openEditModal(loan)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Loan"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteLoan(loan.id, clientName)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Loan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Principal</span>
                    <span className="font-medium">₹{principalAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium text-slate-700">{loanType === 'TOTAL_RATE' ? 'Total Rate' : 'Daily Rate'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Frequency</span>
                    <span className="font-medium text-slate-700">
                      {loanFrequency === 'BIWEEKLY' ? '15 Days' : loanFrequency}
                    </span>
                  </div>
                  {loanType === 'TOTAL_RATE' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tenure</span>
                      <span className="font-medium text-slate-700">{loanTenure} Inst.</span>
                    </div>
                  )}
                  {loanType === 'DAILY_RATE' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rate</span>
                      <span className="font-medium text-slate-700">₹{dailyRatePerLakh}/L/Day</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New/Edit Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingLoan ? 'Edit Loan' : 'Create New Loan'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateLoan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
                <input required type="text" className="w-full border p-2 rounded-lg" value={clientName} onChange={e => setClientName(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    className="w-full border p-2 rounded-lg"
                    value={loanType}
                    onChange={e => setLoanType(e.target.value as LoanType)}
                    disabled={!!editingLoan}
                  >
                    <option value={LoanType.TOTAL_RATE}>Total Rate (Fixed)</option>
                    <option value={LoanType.DAILY_RATE}>Daily Rate (Recurring)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Principal (₹)</label>
                  <input
                    required
                    type="number"
                    className="w-full border p-2 rounded-lg"
                    value={principal}
                    onChange={e => setPrincipal(Number(e.target.value))}
                    disabled={!!editingLoan}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    className="w-full border p-2 rounded-lg"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    disabled={!!editingLoan}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                  <select
                    className="w-full border p-2 rounded-lg"
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as Frequency)}
                    disabled={!!editingLoan}
                  >
                    <option value={Frequency.DAILY}>Daily</option>
                    <option value={Frequency.WEEKLY}>Weekly (7 Days)</option>
                    <option value={Frequency.BIWEEKLY}>Biweekly (15 Days)</option>
                    <option value={Frequency.MONTHLY}>Monthly (30 Days)</option>
                  </select>
                </div>
              </div>

              {loanType === LoanType.TOTAL_RATE ? (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="text-sm font-bold text-slate-600">Total Rate Config</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Multiplier (e.g. 1.2)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full border p-2 rounded-lg"
                        value={multiplier}
                        onChange={e => setMultiplier(Number(e.target.value))}
                        disabled={!!editingLoan}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Tenure (Installments)</label>
                      <input
                        type="number"
                        className="w-full border p-2 rounded-lg"
                        value={tenure}
                        onChange={e => setTenure(Number(e.target.value))}
                        disabled={!!editingLoan}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Total Repayment: <span className="font-bold text-primary-600">₹{Math.ceil(principal * multiplier).toLocaleString()}</span>
                    <br />
                    Per Installment: <span className="font-bold text-primary-600">₹{Math.ceil((principal * multiplier) / tenure).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="text-sm font-bold text-slate-600">Daily Rate Config</h4>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Rate per ₹1 Lakh / Day</label>
                    <input
                      type="number"
                      className="w-full border p-2 rounded-lg"
                      value={dailyRate}
                      onChange={e => setDailyRate(Number(e.target.value))}
                      disabled={!!editingLoan}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Est. Interest (per {days} days): <span className="font-bold text-primary-600">
                      ₹{Math.ceil((principal / 100000) * dailyRate * days).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {editingLoan && (
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-700">
                    <strong>Note:</strong> Only client name can be edited. To change loan terms, please delete and create a new loan.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {editingLoan ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingLoan ? 'Update Loan' : 'Create Loan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;