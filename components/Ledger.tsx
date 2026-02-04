import React, { useRef, useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Transaction } from '../types';
import { Download, Upload, ArrowUpRight, ArrowDownLeft, Loader2, Search, Filter, X } from 'lucide-react';

const Ledger: React.FC = () => {
  const { transactions, addTransaction, isLoading } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      // 1. Search (Name/Description)
      const matchesSearch = searchTerm === '' ||
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Type Filter
      const matchesType = filterType === 'ALL' || t.type === filterType;

      // 3. Category Filter
      const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;

      // 4. Date Filter
      let matchesDate = true;
      if (filterStartDate) {
        matchesDate = matchesDate && new Date(t.date) >= new Date(filterStartDate);
      }
      if (filterEndDate) {
        matchesDate = matchesDate && new Date(t.date) <= new Date(filterEndDate);
      }

      return matchesSearch && matchesType && matchesCategory && matchesDate;
    });

    // Ensure newest first!
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;

      // Secondary sort by created_at
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    });
  }, [transactions, searchTerm, filterType, filterCategory, filterStartDate, filterEndDate]);

  // Group by Week (using filtered transactions)
  const groupedTransactions: Record<string, Transaction[]> = filteredTransactions.reduce(
    (groups: Record<string, Transaction[]>, t: Transaction) => {
      const date = new Date(t.date);
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const weekKey = startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

      if (!groups[weekKey]) groups[weekKey] = [];
      groups[weekKey].push(t);
      return groups;
    },
    {} as Record<string, Transaction[]>
  );


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split(/\r?\n/);
      let count = 0;
      let errors = 0;
      const errorMessages: string[] = [];

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle comma in quoted fields
        const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const [date, amount, type, category, desc] = parts.map(p => p.replace(/^"|"$/g, '').trim());

        if (!date || !amount || !type) {
          errors++;
          errorMessages.push(`Line ${i + 1}: Missing required fields`);
          continue;
        }

        const parsedAmount = parseFloat(amount.replace(/[₹,]/g, ''));
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          errors++;
          errorMessages.push(`Line ${i + 1}: Invalid amount "${amount}"`);
          continue;
        }

        let parsedDate: Date;
        try {
          if (date.includes('-')) {
            const parts = date.split('-');
            if (parts[0].length === 4) {
              parsedDate = new Date(date);
            } else {
              parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          } else if (date.includes('/')) {
            const parts = date.split('/');
            parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            parsedDate = new Date(date);
          }

          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch {
          errors++;
          errorMessages.push(`Line ${i + 1}: Invalid date format "${date}"`);
          continue;
        }

        try {
          await addTransaction({
            date: parsedDate.toISOString(),
            amount: parsedAmount,
            type: type.toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT',
            category: category || 'Imported',
            description: desc || 'CSV Import'
          });
          count++;
        } catch (err: any) {
          errors++;
          errorMessages.push(`Line ${i + 1}: ${err.message || 'Failed to create'}`);
        }
      }

      if (errors > 0) {
        alert(`Imported ${count} transactions. ${errors} failed.\n\nFirst errors:\n${errorMessages.slice(0, 3).join('\n')}`);
      } else if (count === 0) {
        alert('No transactions found in CSV.');
      } else {
        alert(`Imported ${count} transactions successfully.`);
      }
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    // Export FILTERED transactions
    const headers = ['Date', 'Amount', 'Type', 'Category', 'Description'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toISOString().split('T')[0],
      t.amount,
      t.type,
      t.category,
      `"${t.description?.replace(/"/g, '""') || ''}"`
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description'];
    const rows = filteredTransactions.map(t => [
      t.id,
      new Date(t.date).toISOString().split('T')[0],
      t.amount,
      t.type,
      t.category,
      `"${t.description?.replace(/"/g, '""') || ''}"`
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_full_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals from FILTERED transactions
  const totalCredit = filteredTransactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebit = filteredTransactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredit - totalDebit;

  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Transaction Ledger</h2>
          <div className="flex gap-2">
            {/* File Inputs & Exports */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
            />
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 text-sm">
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm">
              <Download size={16} /> CSV
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm">
              <Download size={16} /> Excel
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or description..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Filter size={18} /> Filters
            </button>
            {(searchTerm || filterType !== 'ALL' || filterCategory !== 'ALL' || filterStartDate || filterEndDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('ALL');
                  setFilterCategory('ALL');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={18} /> Clear
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  className="w-full border border-slate-200 p-2 rounded-lg"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="ALL">All Types</option>
                  <option value="CREDIT">Inflow (Credit)</option>
                  <option value="DEBIT">Outflow (Debit)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  className="w-full border border-slate-200 p-2 rounded-lg"
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 p-2 rounded-lg"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 p-2 rounded-lg"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  min={filterStartDate}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Filtered Credits</p>
          <p className="text-2xl font-bold text-emerald-600">+₹{totalCredit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Filtered Debits</p>
          <p className="text-2xl font-bold text-slate-700">-₹{totalDebit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? '+' : ''}₹{netBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          {transactions.length === 0 ? (
            <p className="text-slate-400">No transactions yet.</p>
          ) : (
            <p className="text-slate-400">No transactions match your filters.</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTransactions)
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
            .map(([week, trans]) => (
              <div key={week}>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Week of {week}</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {trans.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 w-32 text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${t.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                {t.type === 'CREDIT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{t.category}</p>
                                <p className="text-xs text-slate-500">{t.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-right font-mono font-medium ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {t.type === 'CREDIT' ? '+' : '-'}₹{t.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Ledger;