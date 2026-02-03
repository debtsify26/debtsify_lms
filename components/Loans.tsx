import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { LoanType, Frequency, LoanStatus } from '../types';
import { Plus, Search, Loader2, Pencil, Trash2, Download, X, ChevronUp, ChevronDown } from 'lucide-react';

const NumericField = ({
  label,
  value,
  onChange,
  onIncrement,
  onDecrement,
  min = 0,
  max,
  prefix,
  disabled = false,
  step = 1
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  prefix?: string;
  disabled?: boolean;
  step?: number;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Allow only numbers and decimals
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return;

    // Remove leading zeros
    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      val = val.replace(/^0+/, '');
    }
    onChange(val);
  };

  const handleIncrement = () => {
    const current = Number(value) || 0;
    if (max !== undefined && current + step > max) return;
    onChange((current + step).toString());
  };

  const handleDecrement = () => {
    const current = Number(value) || 0;
    if (current - step < min) return;
    onChange((current - step).toString());
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex">
        <button
          type="button"
          onClick={onDecrement || handleDecrement}
          disabled={disabled || (Number(value) || 0) <= min}
          className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-l-lg hover:bg-slate-100 disabled:opacity-50 transition-colors flex items-center justify-center"
          title="Decrease"
        >
          <ChevronDown size={18} />
        </button>
        <div className="relative flex-1">
          {prefix && value !== '' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
          <input
            type="text"
            className={`w-full border-y border-slate-200 p-2 focus:outline-none focus:ring-1 focus:ring-primary-500 text-center ${prefix && value !== '' ? 'pl-7' : ''}`}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            required
            placeholder="0"
          />
        </div>
        <button
          type="button"
          onClick={onIncrement || handleIncrement}
          disabled={disabled || (max !== undefined && (Number(value) || 0) >= max)}
          className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-r-lg hover:bg-slate-100 transition-colors flex items-center justify-center"
          title="Increase"
        >
          <ChevronUp size={18} />
        </button>
      </div>
    </div>
  );
};

const Loans: React.FC = () => {
  const { loans, addLoan, updateLoan, deleteLoan, addInstallments, addTransaction, isLoading, refreshData } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [clientName, setClientName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>(LoanType.TOTAL_RATE);
  const [principal, setPrincipal] = useState<string>('10000');
  const [frequency, setFrequency] = useState<string>('7');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Total Rate Specific
  const [multiplier, setMultiplier] = useState<string>('1.2');
  const [tenure, setTenure] = useState<string>('10');

  // Daily Rate Specific
  const [dailyRate, setDailyRate] = useState<string>('100');

  // New Fields
  const [processRate, setProcessRate] = useState<string>('0');
  const [payoutPercentage, setPayoutPercentage] = useState<string>('0');
  const [isAdvancedInstallment, setIsAdvancedInstallment] = useState(false);

  // Get days based on frequency
  const getFrequencyDays = (freq: any): number => {
    if (!isNaN(Number(freq)) && freq !== '') return Number(freq);
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
    setPrincipal(String(loan.principal_amount || loan.principalAmount || ''));
    setFrequency(String(loan.frequency || '7'));
    setStartDate(loan.start_date || loan.startDate);
    setMultiplier(String(loan.total_rate_multiplier || loan.totalRateMultiplier || 1.2));
    setTenure(String(loan.tenure || 10));
    setDailyRate(String(loan.daily_rate_per_lakh || loan.dailyRatePerLakh || 100));
    setProcessRate(String(loan.process_rate || '0'));
    // If we have an absolute payout_rate in DB, but we now use percentage in UI, 
    // we might want to back-calculate, but principal might have changed? 
    // Actually when editing, these fields are disabled anyway per current logic.
    const amt = Number(loan.payout_rate || 0);
    const p = Number(loan.principal_amount || loan.principalAmount || 1);
    setPayoutPercentage(amt > 0 ? ((amt / p) * 100).toFixed(2) : '0');
    setShowModal(true);
  };

  const handleDeleteLoan = async (loanId: string, clientName: string) => {
    if (!window.confirm(`Are you sure you want to delete the loan for "${clientName}"? This will also delete all associated installments.`)) {
      return;
    }

    try {
      await deleteLoan(loanId);
      await refreshData();
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
        process_rate: Number(processRate) || 0,
        payout_rate: (Number(principal) * (Number(payoutPercentage) || 0)) / 100
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

        // Add Transaction for Payout/Commission if applicable
        const calculatedPayout = (Number(principal) * (Number(payoutPercentage) || 0)) / 100;
        if (calculatedPayout > 0) {
          await addTransaction({
            date: new Date().toISOString(),
            amount: calculatedPayout,
            type: 'DEBIT',
            category: 'Payout',
            description: `Commission Payout (${payoutPercentage}%) for ${clientName}'s loan`
          });
        }

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

            // Add process rate to the first installment only
            const expectedAmt = i === 1 ? (installmentAmount + Number(processRate)) : installmentAmount;

            const isFirstAndAdvanced = i === 1 && isAdvancedInstallment;

            newInstallments.push({
              loan_id: loanId,
              client_name: clientName,
              due_date: dueDate.toISOString().split('T')[0],
              expected_amount: expectedAmt,
              paid_amount: isFirstAndAdvanced ? expectedAmt : 0,
              penalty: 0,
              status: isFirstAndAdvanced ? 'PAID' : 'PENDING',
              paid_date: isFirstAndAdvanced ? new Date().toISOString().split('T')[0] : null,
              type: 'REGULAR'
            });

            // If advanced, add a CREDIT transaction for it
            if (isFirstAndAdvanced) {
              await addTransaction({
                date: new Date().toISOString(),
                amount: expectedAmt,
                type: 'CREDIT',
                category: 'Loan Repayment',
                description: `Advanced Installment payment from ${clientName}`
              });
            }
          }
        } else {
          // Daily Rate: Generate FIRST interest installment only
          const interestAmount = Math.ceil((Number(principal) / 100000) * Number(dailyRate) * days);
          const expectedAmt = interestAmount + Number(processRate);

          const dueDate = new Date(start);
          dueDate.setDate(start.getDate() + days);

          const isAdvanced = isAdvancedInstallment;

          newInstallments.push({
            loan_id: loanId,
            client_name: clientName,
            due_date: dueDate.toISOString().split('T')[0],
            expected_amount: expectedAmt,
            paid_amount: isAdvanced ? expectedAmt : 0,
            penalty: 0,
            status: isAdvanced ? 'PAID' : 'PENDING',
            paid_date: isAdvanced ? new Date().toISOString().split('T')[0] : null,
            type: 'INTEREST_ONLY'
          });

          if (isAdvanced) {
            await addTransaction({
              date: new Date().toISOString(),
              amount: expectedAmt,
              type: 'CREDIT',
              category: 'Loan Repayment',
              description: `Advanced Installment payment from ${clientName}`
            });
          }
        }

        if (newInstallments.length > 0) {
          await addInstallments(newInstallments);
        }
      }

      await refreshData();
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
    setPrincipal('10000');
    setFrequency('7');
    setMultiplier('1.2');
    setTenure('10');
    setDailyRate('100');
    setProcessRate('0');
    setPayoutPercentage('0');
    setIsAdvancedInstallment(false);
    setEditingLoan(null);
  };

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
                      {loanFrequency === 'BIWEEKLY' ? '15 Days' :
                        loanFrequency === 'DAILY' ? 'Daily (1 Day)' :
                          loanFrequency === 'WEEKLY' ? 'Weekly (7 Days)' :
                            loanFrequency === 'MONTHLY' ? 'Monthly (30 Days)' :
                              `${loanFrequency} ${Number(loanFrequency) === 1 ? 'Day' : 'Days'}`}
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
                <NumericField
                  label="Principal (₹)"
                  value={principal}
                  onChange={setPrincipal}
                  onIncrement={() => setPrincipal(prev => (Number(prev) + 1000).toString())}
                  onDecrement={() => setPrincipal(prev => Math.max(0, Number(prev) - 1000).toString())}
                  prefix="₹"
                  disabled={!!editingLoan}
                  step={1000}
                />
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
                <NumericField
                  label="Frequency (Days)"
                  value={frequency}
                  onChange={setFrequency}
                  onIncrement={() => setFrequency(prev => Math.min(30, Number(prev) + 1).toString())}
                  onDecrement={() => setFrequency(prev => Math.max(1, Number(prev) - 1).toString())}
                  min={1}
                  max={30}
                  disabled={!!editingLoan}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Process Rate (₹) - <span className="text-slate-400 font-normal italic">Optional</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input
                      type="text"
                      className="w-full border border-slate-200 p-2 pl-7 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                      value={processRate}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) setProcessRate(val);
                      }}
                      placeholder="0"
                      disabled={!!editingLoan}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Commission (%) - <span className="text-slate-400 font-normal italic">Optional</span></label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    <input
                      type="text"
                      className="w-full border border-slate-200 p-2 pr-7 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                      value={payoutPercentage}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) setPayoutPercentage(val);
                      }}
                      placeholder="0"
                      disabled={!!editingLoan}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
                    <span>Est. Payout:</span>
                    <span className="font-medium text-slate-600">₹{((Number(principal) * (Number(payoutPercentage) || 0)) / 100).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {!editingLoan && (
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isAdvancedInstallment}
                      onChange={e => setIsAdvancedInstallment(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                  <div>
                    <span className="block text-sm font-bold text-primary-900">Advanced Installment</span>
                    <span className="block text-xs text-primary-700 text-pretty">First installment will be marked as paid immediately.</span>
                  </div>
                </div>
              )}

              {loanType === LoanType.TOTAL_RATE ? (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="text-sm font-bold text-slate-600">Total Rate Config</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <NumericField
                      label="Multiplier (x)"
                      value={multiplier}
                      onChange={setMultiplier}
                      onIncrement={() => setMultiplier(prev => (Number(prev) + 0.05).toFixed(2))}
                      onDecrement={() => setMultiplier(prev => Math.max(1, Number(prev) - 0.05).toFixed(2))}
                      min={1}
                      disabled={!!editingLoan}
                      step={0.05}
                    />
                    <NumericField
                      label="Tenure (Installments)"
                      value={tenure}
                      onChange={setTenure}
                      onIncrement={() => setTenure(prev => (Number(prev) + 1).toString())}
                      onDecrement={() => setTenure(prev => Math.max(1, Number(prev) - 1).toString())}
                      min={1}
                      disabled={!!editingLoan}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Total Repayment: <span className="font-bold text-primary-600">₹{(Math.ceil(Number(principal) * Number(multiplier)) + Number(processRate)).toLocaleString()}</span>
                    <br />
                    1st Installment: <span className="font-bold text-primary-600">₹{(Math.ceil((Number(principal) * Number(multiplier)) / (Number(tenure) || 1)) + Number(processRate)).toLocaleString()}</span>
                    <br />
                    Other Installments: <span className="font-bold text-slate-600">₹{Math.ceil((Number(principal) * Number(multiplier)) / (Number(tenure) || 1)).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="text-sm font-bold text-slate-600">Daily Rate Config</h4>
                  <NumericField
                    label="Rate per ₹1 Lakh / Day"
                    value={dailyRate}
                    onChange={setDailyRate}
                    onIncrement={() => setDailyRate(prev => (Number(prev) + 10).toString())}
                    onDecrement={() => setDailyRate(prev => Math.max(0, Number(prev) - 10).toString())}
                    prefix="₹"
                    disabled={!!editingLoan}
                    step={10}
                  />
                  <div className="text-xs text-slate-500 mt-2">
                    1st Interest (per {days} days): <span className="font-bold text-primary-600">
                      ₹{(Math.ceil((Number(principal) / 100000) * Number(dailyRate) * days) + Number(processRate)).toLocaleString()}
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