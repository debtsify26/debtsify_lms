import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { LoanType, Frequency } from '../types';
import { Plus, Search, Loader2, Pencil, Trash2, Download, X, ChevronUp, ChevronDown } from 'lucide-react';

const SimpleInput = ({
  label,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  prefix,
  suffix,
  placeholder = "0",
  type,
  onIncrement,
  onDecrement
}: {
  label: string;
  value: string | number;
  onChange?: (val: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  type?: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
        <input
          type={type || "text"}
          className={`w-full border border-slate-200 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''} ${onIncrement ? 'pr-8' : ''} ${readOnly ? 'bg-slate-50 text-slate-500' : ''}`}
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          disabled={disabled || readOnly}
          readOnly={readOnly}
          placeholder={placeholder}
        />
        {onIncrement && onDecrement && !disabled && !readOnly ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
            <button
              type="button"
              onClick={onIncrement}
              className="text-slate-400 hover:text-primary-600 focus:outline-none bg-slate-100 hover:bg-slate-200 rounded px-0.5"
            >
              <ChevronUp size={10} />
            </button>
            <button
              type="button"
              onClick={onDecrement}
              className="text-slate-400 hover:text-primary-600 focus:outline-none bg-slate-100 hover:bg-slate-200 rounded px-0.5"
            >
              <ChevronDown size={10} />
            </button>
          </div>
        ) : (
          suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>
        )}
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Renamed/New Fields
  const [installmentDays, setInstallmentDays] = useState<string>('7'); // Was frequency
  const [totalDuration, setTotalDuration] = useState<string>('70'); // New "Tenure" (Days)

  // Total Rate Specific
  const [multiplier, setMultiplier] = useState<string>('1.2');

  // Daily Rate Specific
  const [dailyRate, setDailyRate] = useState<string>('100');

  // Fees
  const [processFeePercent, setProcessFeePercent] = useState<string>('0');
  const [payoutPercentage, setPayoutPercentage] = useState<string>('0');
  const [isAdvancedInstallment, setIsAdvancedInstallment] = useState(false);

  // Derived Values
  const numInstallments = React.useMemo(() => {
    const dur = Number(totalDuration) || 0;
    const days = Number(installmentDays) || 1;
    return Math.ceil(dur / days);
  }, [totalDuration, installmentDays]);

  // Get days based on frequency (Legacy support helper)
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
    setStartDate(loan.start_date || loan.startDate);

    // Installment Days (Frequency)
    const freq = loan.frequency;
    const freqDays = getFrequencyDays(freq);
    setInstallmentDays(String(freqDays));

    // Tenure (Duration)
    // Old data has tenure as count. New data has tenure as days? 
    // Wait, backend 'tenure' is count. 
    // So to populate 'totalDuration', we need tenure(count) * frequency(days).
    const count = Number(loan.tenure || 10);
    setTotalDuration(String(count * freqDays));

    setMultiplier(String(loan.total_rate_multiplier || loan.totalRateMultiplier || 1.2));
    setDailyRate(String(loan.daily_rate_per_lakh || loan.dailyRatePerLakh || 100));

    // Process Fee Percent
    const pFee = Number(loan.process_rate || 0);
    const pAmt = Number(loan.principal_amount || loan.principalAmount || 1);
    setProcessFeePercent(pFee > 0 ? ((pFee / pAmt) * 100).toFixed(2) : '0');

    // Payout Percent
    const payAmt = Number(loan.payout_rate || 0);
    setPayoutPercentage(payAmt > 0 ? ((payAmt / pAmt) * 100).toFixed(2) : '0');

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
      // Calculate Amounts
      const principalAmt = Number(principal);
      const processAmt = (principalAmt * (Number(processFeePercent) || 0)) / 100;
      const payoutAmt = (principalAmt * (Number(payoutPercentage) || 0)) / 100;

      const loanData: any = {
        client_name: clientName,
        type: loanType,
        principal_amount: principalAmt,
        start_date: startDate,
        status: 'ACTIVE',
        frequency: installmentDays, // Send digits as string
        disbursement_date: startDate,
        process_rate: processAmt,
        payout_rate: payoutAmt
      };

      if (loanType === LoanType.TOTAL_RATE) {
        loanData.total_rate_multiplier = Number(multiplier);
        loanData.tenure = numInstallments; // Backend expects count
      } else {
        loanData.daily_rate_per_lakh = Number(dailyRate);
      }

      if (editingLoan) {
        await updateLoan(editingLoan.id, loanData);
      } else {
        const createdLoan = await addLoan(loanData);
        const loanId = createdLoan.id;

        // Transactions
        await addTransaction({
          date: new Date().toISOString(),
          amount: principalAmt,
          type: 'DEBIT',
          category: 'Loan Disbursement',
          description: `Disbursed to ${clientName}`,
          related_entity_id: loanId
        });

        if (payoutAmt > 0) {
          await addTransaction({
            date: new Date().toISOString(),
            amount: payoutAmt,
            type: 'DEBIT',
            category: 'Payout',
            description: `${clientName} (${principalAmt}) ${startDate} - payout fees (${payoutPercentage}%)`,
            related_entity_id: loanId
          });
        }

        if (processAmt > 0) {
          await addTransaction({
            date: new Date().toISOString(),
            amount: processAmt,
            type: 'CREDIT',
            category: 'Processing Fee',
            description: `${clientName} (${principalAmt}) - ${startDate} - processing fees (${processFeePercent}%)`,
            related_entity_id: loanId
          });
        }

        // Installments
        const newInstallments: any[] = [];
        const start = new Date(startDate);
        const days = Number(installmentDays);

        if (loanType === LoanType.TOTAL_RATE) {
          const totalAmount = principalAmt * Number(multiplier);
          const installmentAmount = Math.ceil(totalAmount / (numInstallments || 1));

          for (let i = 1; i <= numInstallments; i++) {
            const dueDate = new Date(start);
            dueDate.setDate(start.getDate() + (i * days));

            // Process rate is now separate, so no addition to first installment
            const expectedAmt = installmentAmount;
            const isLastAndAdvanced = isAdvancedInstallment && (i === numInstallments);

            newInstallments.push({
              loan_id: loanId,
              client_name: clientName,
              due_date: dueDate.toISOString().split('T')[0],
              expected_amount: expectedAmt,
              paid_amount: isLastAndAdvanced ? expectedAmt : 0,
              penalty: 0,
              status: isLastAndAdvanced ? 'PAID' : 'PENDING',
              paid_date: isLastAndAdvanced ? new Date().toISOString().split('T')[0] : null,
              type: 'REGULAR'
            });

            if (isLastAndAdvanced) {
              await addTransaction({
                date: new Date().toISOString(),
                amount: expectedAmt,
                type: 'CREDIT',
                category: 'Loan Repayment',
                description: `Advanced Installment (Last) payment from ${clientName}`,
                related_entity_id: loanId
              });
            }
          }
        } else {
          // Daily Rate
          const interestAmount = Math.ceil((principalAmt / 100000) * Number(dailyRate) * days);
          const expectedAmt = interestAmount;

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
              description: `Advanced Installment payment from ${clientName}`,
              related_entity_id: loanId
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
    setStartDate(new Date().toISOString().split('T')[0]);
    setInstallmentDays('7');
    setTotalDuration('70');
    setMultiplier('1.2');
    setDailyRate('100');
    setProcessFeePercent('0');
    setPayoutPercentage('0');
    setIsAdvancedInstallment(false);
    setEditingLoan(null);
  };

  // Export Logic
  const exportToExcel = () => {
    const headers = ['ID', 'Client Name', 'Type', 'Principal', 'Installment Days', 'Status', 'Start Date', 'Multiplier/Rate', 'Num Installments'];
    const rows = loans.map(loan => {
      const clientName = loan.client_name || loan.clientName;
      const principalAmt = loan.principal_amount || loan.principalAmount;
      const rateOrMultiplier = loan.type === 'TOTAL_RATE'
        ? (loan.total_rate_multiplier || loan.totalRateMultiplier || '-')
        : (loan.daily_rate_per_lakh || loan.dailyRatePerLakh || '-');

      // Helper for display
      const freq = loan.frequency;
      const days = getFrequencyDays(freq);

      return [
        loan.id,
        clientName,
        loan.type,
        principalAmt,
        days,
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
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || l.id.includes(searchTerm);
  });

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
          <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm">
            <Download size={18} /> Export
          </button>
          <button onClick={async () => {
            try {
              const { installmentsAPI } = await import('../services/api');
              await installmentsAPI.syncLoanStatuses();
              await refreshData();
              alert('Loan statuses synced successfully!');
            } catch (err: any) {
              alert(`Sync failed: ${err.message}`);
            }
          }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm">
            <Download size={18} /> Sync Statuses
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm">
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
            const loanTenure = loan.tenure;
            const dailyRatePerLakh = loan.daily_rate_per_lakh || loan.dailyRatePerLakh;
            const freqDays = getFrequencyDays(loan.frequency);

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
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{loan.status}</span>
                    <button onClick={() => openEditModal(loan)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Loan"><Pencil size={16} /></button>
                    <button onClick={() => handleDeleteLoan(loan.id, clientName)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Loan"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Principal</span><span className="font-medium">₹{principalAmount?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium text-slate-700">{loanType === 'TOTAL_RATE' ? 'Total Rate' : 'Daily Rate'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Installments</span><span className="font-medium text-slate-700">Every {freqDays} Days</span></div>
                  {loanType === 'TOTAL_RATE' && (
                    <div className="flex justify-between"><span className="text-slate-500">Number of Inst.</span><span className="font-medium text-slate-700">{loanTenure}</span></div>
                  )}
                  {loanType === 'DAILY_RATE' && (
                    <div className="flex justify-between"><span className="text-slate-500">Rate</span><span className="font-medium text-slate-700">₹{dailyRatePerLakh}/L/Day</span></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">{editingLoan ? 'Edit Loan' : 'Create New Loan'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateOrUpdateLoan} className="space-y-4">
              <SimpleInput label="Client Name" value={clientName} onChange={setClientName} disabled={false} />

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
                <SimpleInput label="Principal (₹)" value={principal} onChange={setPrincipal} disabled={!!editingLoan} prefix="₹" />
              </div>

              {/* Multiplier moved below Type as requested */}
              {loanType === LoanType.TOTAL_RATE && (
                <SimpleInput
                  label="Multiplier (x)"
                  value={multiplier}
                  onChange={setMultiplier}
                  disabled={!!editingLoan}
                  onIncrement={() => setMultiplier(prev => (Number(prev) + 0.05).toFixed(2))}
                  onDecrement={() => setMultiplier(prev => Math.max(1, Number(prev) - 0.05).toFixed(2))}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <SimpleInput label="Start Date" value={startDate} onChange={setStartDate} disabled={!!editingLoan} placeholder="YYYY-MM-DD" type="date" />
                <SimpleInput label="Installment Days" value={installmentDays} onChange={setInstallmentDays} disabled={!!editingLoan} />
              </div>

              {loanType === LoanType.TOTAL_RATE && (
                <div className="grid grid-cols-2 gap-4">
                  <SimpleInput label="Tenure (Days)" value={totalDuration} onChange={setTotalDuration} disabled={!!editingLoan} />
                  <SimpleInput label="Number of Installments" value={numInstallments} disabled readOnly />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <SimpleInput label="Processing Fees (%)" value={processFeePercent} onChange={setProcessFeePercent} disabled={!!editingLoan} suffix="%" />
                <SimpleInput label="Payout (%)" value={payoutPercentage} onChange={setPayoutPercentage} disabled={!!editingLoan} suffix="%" />
              </div>

              <div className="text-[10px] text-slate-400 flex justify-between px-1">
                <span>Fee: ₹{((Number(principal) * (Number(processFeePercent) || 0)) / 100).toLocaleString()}</span>
                <span>Payout: ₹{((Number(principal) * (Number(payoutPercentage) || 0)) / 100).toLocaleString()}</span>
              </div>

              {!editingLoan && (
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isAdvancedInstallment} onChange={e => setIsAdvancedInstallment(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                  <div>
                    <span className="block text-sm font-bold text-primary-900">Advanced Installment</span>
                    <span className="block text-xs text-primary-700 text-pretty">Last installment paid immediately.</span>
                  </div>
                </div>
              )}

              {loanType === LoanType.DAILY_RATE && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="text-sm font-bold text-slate-600">Daily Rate Config</h4>
                  <SimpleInput label="Rate per ₹1 Lakh / Day" value={dailyRate} onChange={setDailyRate} prefix="₹" disabled={!!editingLoan} />
                </div>
              )}

              {/* Summary for Total Rate */}
              {loanType === LoanType.TOTAL_RATE && (
                <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Repayment:</span>
                    <span className="font-bold text-primary-600">₹{(Math.ceil(Number(principal) * Number(multiplier))).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1st Installment:</span>
                    <span className="font-bold">₹{Math.ceil((Number(principal) * Number(multiplier)) / (numInstallments || 1)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Regular Installment:</span>
                    <span className="font-bold">₹{Math.ceil((Number(principal) * Number(multiplier)) / (numInstallments || 1)).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> {editingLoan ? 'Updating...' : 'Creating...'}</> : editingLoan ? 'Update Loan' : 'Create Loan'}
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