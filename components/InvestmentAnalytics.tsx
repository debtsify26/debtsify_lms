import React from 'react';
import { useData } from '../context/DataContext';
import { Wallet, TrendingUp, Landmark, PieChart, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const InvestmentAnalytics: React.FC = () => {
    const { loans, installments, financialSummary } = useData();

    const activeLoans = loans.filter(l => l.status === 'ACTIVE');

    // Logic to calculate per-person breakdown
    const investmentBreakdown = activeLoans.map(loan => {
        const l_principal = Number(loan.principal_amount || loan.principalAmount || 0);
        const multiplier = Number(loan.total_rate_multiplier || loan.totalRateMultiplier || 1);
        const total_repay = l_principal * multiplier;
        const total_interest = total_repay - l_principal;

        // Calculate received amount
        const loan_insts = installments.filter(i => (i.loan_id || i.loanId) === loan.id);
        const received = loan_insts.reduce((sum, inst) => sum + Number(inst.paid_amount || inst.paidAmount || 0), 0);

        // Market value (Remaining)
        const market_total = Math.max(0, total_repay - received);
        const market_principal = total_repay > 0 ? (market_total * (l_principal / total_repay)) : 0;
        const market_interest = market_total - market_principal;

        return {
            person: loan.client_name || loan.clientName,
            startDate: loan.start_date || loan.startDate,
            cycle: loan.frequency,
            capital: l_principal,
            interestRate: ((multiplier - 1) * 100).toFixed(0),
            totalInterest: total_interest,
            received: received,
            marketPrincipal: market_principal,
            marketInterest: market_interest,
            marketTotal: market_total
        };
    });

    const SummaryCard = ({ title, value, subValue, icon: Icon, color }: any) => (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon size={20} className="text-white" />
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">₹{value.toLocaleString()}</h3>
                {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Money in Hand"
                    value={financialSummary?.total_collected || 0}
                    subValue="Total repayments received"
                    icon={Wallet}
                    color="bg-emerald-500"
                />
                <SummaryCard
                    title="Money in Market"
                    value={financialSummary?.market_amount || 0}
                    subValue={`Principal: ₹${(financialSummary?.market_principal || 0).toLocaleString()}`}
                    icon={Landmark}
                    color="bg-blue-500"
                />
                <SummaryCard
                    title="Total Interest"
                    value={financialSummary?.total_interest_expected || 0}
                    subValue="Profit from active investments"
                    icon={TrendingUp}
                    color="bg-amber-500"
                />
                <SummaryCard
                    title="Final Value"
                    value={(financialSummary?.total_disbursed || 0) + (financialSummary?.total_interest_expected || 0)}
                    subValue="Projected total after closure"
                    icon={PieChart}
                    color="bg-indigo-500"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Investment Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Person</th>
                                <th className="px-6 py-4 font-medium">Start Date</th>
                                <th className="px-6 py-4 font-medium">Cycle</th>
                                <th className="px-6 py-4 font-medium">Capital</th>
                                <th className="px-6 py-4 font-medium">Int (%)</th>
                                <th className="px-6 py-4 font-medium text-right">Received</th>
                                <th className="px-6 py-4 font-medium text-right">Mkt Principal</th>
                                <th className="px-6 py-4 font-medium text-right">Mkt Interest</th>
                                <th className="px-6 py-4 font-medium text-right font-bold">Total Market Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {investmentBreakdown.length === 0 ? (
                                <tr><td colSpan={9} className="p-8 text-center text-slate-400">No active investments found</td></tr>
                            ) : (
                                investmentBreakdown.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">{row.person}</td>
                                        <td className="px-6 py-4 text-slate-500">{row.startDate}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {row.cycle === 'BIWEEKLY' ? '15d' :
                                                row.cycle === 'DAILY' ? '1d' :
                                                    row.cycle === 'WEEKLY' ? '7d' :
                                                        row.cycle === 'MONTHLY' ? '30d' :
                                                            `${row.cycle}d`}
                                        </td>
                                        <td className="px-6 py-4 font-mono">₹{row.capital.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-600">{row.interestRate}%</td>
                                        <td className="px-6 py-4 text-right text-emerald-600 font-medium">₹{row.received.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-slate-600">₹{Math.ceil(row.marketPrincipal).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-amber-600">₹{Math.ceil(row.marketInterest).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">₹{Math.ceil(row.marketTotal).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvestmentAnalytics;
