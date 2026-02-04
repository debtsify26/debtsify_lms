import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Wallet, TrendingUp, Landmark, Users } from 'lucide-react';

const InvestmentAnalytics: React.FC = () => {
    const { loans, installments, localSummary } = useData();

    // Calculate dynamic data from local context
    const { cashInHand } = localSummary();

    const activeLoans = loans.filter(l => l.status === 'ACTIVE');

    // Logic to calculate per-person breakdown
    // Using useMemo to prevent recalculation on every render unless data changes
    const investmentBreakdown = useMemo(() => {
        return activeLoans.map(loan => {
            const l_principal = Number(loan.principal_amount || loan.principalAmount || 0);
            const multiplier = Number(loan.total_rate_multiplier || loan.totalRateMultiplier || 1);

            // For Total Rate: Principal * Multiplier
            // For Daily Rate: We need to determine "Total expected" differently or just show Principal + Accrued?
            // Existing logic assumes Total Rate logic mostly. 
            // If Daily Rate, 'total_repay' is tricky because it's indefinite.
            // Let's assume for Daily Rate loan, we just track Principal + Current Due?
            // The previous logic was: total_repay = l_principal * multiplier.
            // If Daily Rate, multiplier might be 1 (or 0?).
            // Let's stick to existing logic but safe guard multiplier.

            const total_repay = loan.type === 'TOTAL_RATE'
                ? l_principal * multiplier
                : l_principal; // For Daily Rate, "Market Capital" is just Principal

            const total_interest = loan.type === 'TOTAL_RATE'
                ? total_repay - l_principal
                : 0; // Interest is calculated daily, not fixed upfront

            // Calculate received amount
            const loan_insts = installments.filter(i => (i.loan_id || i.loanId) === loan.id);
            const received = loan_insts.reduce((sum, inst) => sum + Number(inst.paid_amount || inst.paidAmount || 0), 0);

            // Market value (Remaining)
            // For Total Rate: Total Expected - Received
            // For Daily Rate: Principal is the main "Market Value" until settled.
            const market_total = Math.max(0, total_repay - received);

            // Breakdown remaining into Principal vs Interest
            const market_principal = total_repay > 0 ? (market_total * (l_principal / total_repay)) : 0;
            const market_interest = market_total - market_principal;

            // Frequency Display
            const cycle = loan.frequency;
            let cycleLabel = `${cycle}d`;
            if (cycle === '1' || cycle === 1 || cycle === 'DAILY') cycleLabel = 'Daily';
            else if (cycle === '7' || cycle === 7 || cycle === 'WEEKLY') cycleLabel = 'Weekly';
            else if (cycle === '15' || cycle === 15 || cycle === 'BIWEEKLY') cycleLabel = '15 Days';
            else if (cycle === '30' || cycle === 30 || cycle === 'MONTHLY') cycleLabel = 'Monthly';

            return {
                person: loan.client_name || loan.clientName,
                startDate: loan.start_date || loan.startDate,
                cycle: cycleLabel,
                capital: l_principal,
                interestRate: loan.type === 'TOTAL_RATE' ? ((multiplier - 1) * 100).toFixed(0) : 'Daily',
                totalInterest: total_interest,
                received: received,
                marketPrincipal: market_principal,
                marketInterest: market_interest,
                marketTotal: market_total,
                loanType: loan.type
            };
        });
    }, [activeLoans, installments]);

    // Calculate totals for cards
    const totalMoneyInMarket = investmentBreakdown.reduce((sum, item) => sum + item.marketTotal, 0);
    const totalPrincipalInMarket = investmentBreakdown.reduce((sum, item) => sum + item.marketPrincipal, 0);
    const totalProjectedInterest = investmentBreakdown.reduce((sum, item) => sum + item.totalInterest, 0);
    const totalReceived = investmentBreakdown.reduce((sum, item) => sum + item.received, 0);

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    title="Money in Hand"
                    value={totalReceived}
                    subValue="Total repayments received"
                    icon={Wallet}
                    color="bg-emerald-500"
                />
                <SummaryCard
                    title="Money in Market"
                    value={totalMoneyInMarket}
                    subValue={`Principal: ₹${Math.round(totalPrincipalInMarket).toLocaleString()}`}
                    icon={Landmark}
                    color="bg-blue-500"
                />
                <SummaryCard
                    title="Expected Interest"
                    value={totalProjectedInterest}
                    subValue="Total projected profit from active loans"
                    icon={TrendingUp}
                    color="bg-amber-500"
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
                                        <td className="px-6 py-4 text-slate-600">{row.cycle}</td>
                                        <td className="px-6 py-4 font-mono">₹{row.capital.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-600">{row.interestRate === 'Daily' ? 'Daily' : `${row.interestRate}%`}</td>
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
