import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Transaction } from '../types';
import { Download, Upload, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';

const Ledger: React.FC = () => {
  const { transactions, addTransaction, isLoading } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Group by Week
  const groupedTransactions: Record<string, Transaction[]> = transactions.reduce(
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
      const lines = csv.split(/\r?\n/);  // Handle both Windows and Unix line endings
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

        // Parse amount
        const parsedAmount = parseFloat(amount.replace(/[₹,]/g, ''));
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          errors++;
          errorMessages.push(`Line ${i + 1}: Invalid amount "${amount}"`);
          continue;
        }

        // Parse date - handle multiple formats
        let parsedDate: Date;
        try {
          // Try different date formats
          if (date.includes('-')) {
            // YYYY-MM-DD or DD-MM-YYYY
            const parts = date.split('-');
            if (parts[0].length === 4) {
              parsedDate = new Date(date);
            } else {
              parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          } else if (date.includes('/')) {
            // DD/MM/YYYY or MM/DD/YYYY
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
          console.error('Failed to import transaction:', err);
        }
      }

      if (errors > 0) {
        console.log('Import errors:', errorMessages);
        alert(`Imported ${count} transactions. ${errors} failed.\n\nFirst errors:\n${errorMessages.slice(0, 3).join('\n')}`);
      } else if (count === 0) {
        alert('No transactions found in CSV. Make sure the format is:\nDate,Amount,Type,Category,Description');
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

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Amount', 'Type', 'Category', 'Description'];
    const rows = transactions.map(t => [
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

  // Export to Excel format (with more details)
  const handleExportExcel = () => {
    const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description'];
    const rows = transactions.map(t => [
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

  // Calculate totals
  const totalCredit = transactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebit = transactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredit - totalDebit;

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
        <h2 className="text-2xl font-bold text-slate-800">Transaction Ledger</h2>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Total Credits</p>
          <p className="text-2xl font-bold text-emerald-600">+₹{totalCredit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Total Debits</p>
          <p className="text-2xl font-bold text-slate-700">-₹{totalDebit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? '+' : ''}₹{netBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <p className="text-slate-400">No transactions yet. Create a loan or import transactions to get started.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTransactions).map(([week, trans]) => (
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