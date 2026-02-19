import React from 'react';
import { useData } from '../context/DataContext';

import { TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';

const KPICard = ({ title, amount, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">
        ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </h3>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="text-white" size={24} />
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { localSummary, installments, transactions, addTransaction, addTransactions, refreshData, isLoading } = useData();
  const summary = localSummary();
  const [showTransModal, setShowTransModal] = React.useState(false);
  const [transType, setTransType] = React.useState<'CREDIT' | 'DEBIT'>('DEBIT');
  const [transAmount, setTransAmount] = React.useState('');
  const [transDescription, setTransDescription] = React.useState('');
  const [transCategory, setTransCategory] = React.useState('Business Expense');
  const [transDate, setTransDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [transEndDate, setTransEndDate] = React.useState('');
  const [isDateRange, setIsDateRange] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const openTransModal = (type: 'CREDIT' | 'DEBIT') => {
    setTransType(type);
    setTransCategory(type === 'DEBIT' ? 'Business Expense' : 'Business Income');
    const today = new Date().toISOString().split('T')[0];
    setTransDate(today);
    setTransEndDate(today);
    setIsDateRange(false);
    setTransAmount('');
    setTransDescription('');
    setShowTransModal(true);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const transactionsData: any[] = [];

    try {
      if (isDateRange && transEndDate) {
        const start = new Date(transDate);
        const end = new Date(transEndDate);

        // Loop from start to end (inclusive)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          // Construct date object
          let finalDate = new Date(d);
          const todayStr = new Date().toISOString().split('T')[0];
          const dStr = d.toISOString().split('T')[0];

          // If the date is 'today', use current time to ensure it looks 'latest'
          if (dStr === todayStr) {
            const now = new Date();
            finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          }

          transactionsData.push({
            date: finalDate.toISOString(),
            amount: Number(transAmount),
            type: transType,
            category: transCategory,
            description: transDescription
          });
        }

        if (transactionsData.length === 0 && start.getTime() <= end.getTime()) {
          // Fallback for same day range
          transactionsData.push({
            date: new Date(transDate).toISOString(),
            amount: Number(transAmount),
            type: transType,
            category: transCategory,
            description: transDescription
          });
        } else if (transactionsData.length === 0) {
          throw new Error("End date must be after Start date");
        }

        // Single bulk call
        await addTransactions(transactionsData);

      } else {
        // Single transaction
        let finalDate = new Date(transDate);
        const todayStr = new Date().toISOString().split('T')[0];
        if (transDate === todayStr) {
          finalDate = new Date(); // Use current date & time
        }

        await addTransaction({
          date: finalDate.toISOString(),
          amount: Number(transAmount),
          type: transType,
          category: transCategory,
          description: transDescription
        });
      }

      await refreshData();
      setShowTransModal(false);
      setTransAmount('');
      setTransDescription('');

      if (isDateRange) {
        alert(`Successfully added ${transactionsData.length} transactions.`);
      } else {
        alert('Transaction added successfully.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // ... (prepare chart data remains same)
  const now = new Date();
  const monthlyFlow = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toLocaleString('default', { month: 'short' });

    // Filter transactions for this month
    const monthlyTrans = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
    });

    const inflow = monthlyTrans.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const outflow = monthlyTrans.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

    return { name: monthKey, Inflow: inflow, Outflow: outflow };
  }).reverse();

  const statusData = [
    { name: 'Paid On-Time', value: installments.filter(i => i.status === 'PAID' && !i.penalty).length },
    { name: 'Paid Late', value: installments.filter(i => i.status === 'PAID' && i.penalty > 0).length },
    { name: 'Pending', value: installments.filter(i => i.status === 'PENDING').length },
    { name: 'Overdue', value: installments.filter(i => i.status === 'OVERDUE').length },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

  const upcomingDue = installments
    .filter(i => i.status === 'PENDING' || i.status === 'OVERDUE')
    .sort((a, b) => {
      const dateA = a.due_date || a.dueDate;
      const dateB = b.due_date || b.dueDate;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Financial Overview</h2>
        <div className="flex gap-2">
          <button
            onClick={() => openTransModal('CREDIT')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
          >
            <TrendingUp size={18} /> Add Inflow
          </button>
          <button
            onClick={() => openTransModal('DEBIT')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
          >
            <TrendingDown size={18} /> Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Inflow"
          amount={summary.totalInflow}
          icon={TrendingUp}
          color="bg-emerald-500"
        />
        <KPICard
          title="Total Outflow"
          amount={Math.max(0, summary.totalOutflow - summary.totalInflow)}
          icon={TrendingDown}
          color="bg-rose-500"
        />
        <KPICard
          title="Amount in Market"
          amount={summary.marketAmount}
          icon={Wallet}
          color="bg-blue-500"
        />
        <KPICard
          title="Total Disbursed"
          amount={summary.totalDisbursed}
          icon={TrendingDown}
          color="bg-slate-700"
        />
      </div>

      {showTransModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${transType === 'CREDIT' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {transType === 'CREDIT' ? 'Add Inflow' : 'Add Expense'}
              </h3>
              <button onClick={() => setShowTransModal(false)} className="text-slate-400 hover:text-slate-600">
                <TrendingDown size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="dateRange"
                  checked={isDateRange}
                  onChange={e => setIsDateRange(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <label htmlFor="dateRange" className="text-sm font-medium text-slate-700 select-none">Add for Date Range</label>
              </div>

              {!isDateRange ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    required
                    type="date"
                    className="w-full border p-2 rounded-lg"
                    value={transDate}
                    onChange={e => setTransDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      required
                      type="date"
                      className="w-full border p-2 rounded-lg"
                      value={transDate}
                      onChange={e => setTransDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      required
                      type="date"
                      className="w-full border p-2 rounded-lg"
                      value={transEndDate}
                      onChange={e => setTransEndDate(e.target.value)}
                      min={transDate}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  required
                  type="text"
                  className="w-full border p-2 rounded-lg"
                  placeholder={transType === 'CREDIT' ? "e.g. Service Fee, Sales" : "e.g. Office Rent, Tea/Coffee"}
                  value={transDescription}
                  onChange={e => setTransDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) {isDateRange && <span className="text-xs text-slate-400 block font-normal">(Per Day)</span>}</label>
                  <input
                    required
                    type="number"
                    className="w-full border p-2 rounded-lg"
                    placeholder="0"
                    value={transAmount}
                    onChange={e => setTransAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    className="w-full border p-2 rounded-lg"
                    value={transCategory}
                    onChange={e => setTransCategory(e.target.value)}
                  >
                    {transType === 'DEBIT' ? (
                      <>
                        <option value="Business Expense">Business</option>
                        <option value="Personal Expense">Personal</option>
                        <option value="Expense">Other</option>
                      </>
                    ) : (
                      <>
                        <option value="Business Income">Business</option>
                        <option value="Personal Income">Personal</option>
                        <option value="Income">Other</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransModal(false)}
                  className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${transType === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      {transType === 'CREDIT' ? 'Record Inflow' : 'Record Expense'}
                      {isDateRange && <span className="text-xs opacity-75">(Multiple)</span>}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Upcoming List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h4 className="text-lg font-bold text-slate-800">Upcoming & Overdue</h4>
          <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded">Next 5 Due</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Due Date</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcomingDue.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400">No pending installments</td></tr>
              ) : (
                upcomingDue.map(inst => {
                  const dueDate = inst.due_date || inst.dueDate;
                  const clientName = inst.client_name || inst.clientName;
                  const expectedAmount = inst.expected_amount || inst.expectedAmount;

                  return (
                    <tr key={inst.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-700">{dueDate}</td>
                      <td className="px-6 py-3 text-slate-800 font-medium">{clientName}</td>
                      <td className="px-6 py-3 text-right text-slate-700">₹{expectedAmount?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${inst.status === 'OVERDUE'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-blue-100 text-blue-600'
                          }`}>
                          {inst.status}
                        </span>
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

export default Dashboard;