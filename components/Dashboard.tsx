import React from 'react';
import { useData } from '../context/DataContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
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
  const { getFinancialSummary, installments, transactions, isLoading } = useData();
  const summary = getFinancialSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Prepare Chart Data
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="Amount in Market"
          amount={summary.marketAmount}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <KPICard
          title="Amount in Hand"
          amount={summary.cashInHand}
          icon={Wallet}
          color="bg-emerald-500"
        />
        <KPICard
          title="Total Disbursed"
          amount={summary.totalDisbursed}
          icon={TrendingDown}
          color="bg-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
          <h4 className="text-lg font-bold text-slate-800 mb-4">Monthly Cash Flow</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyFlow}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="Inflow" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Outflow" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 flex flex-col">
          <h4 className="text-lg font-bold text-slate-800 mb-4">Installment Status</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs text-slate-500 mt-2">
            {statusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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