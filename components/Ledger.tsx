import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { TransactionType, Transaction } from '../types';
import { Download, Upload, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const Ledger: React.FC = () => {
  const { transactions, addTransaction } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Group by Week
  const groupedTransactions = transactions.reduce((groups, t) => {
    const date = new Date(t.date);
    // Get start of week (Sunday)
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekKey = startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (!groups[weekKey]) groups[weekKey] = [];
    groups[weekKey].push(t);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n');
      let count = 0;
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [date, amount, type, category, desc] = line.split(',');
        
        if (date && amount && type) {
           addTransaction({
             id: Math.random().toString(36).substr(2, 9),
             date: new Date(date).toISOString(),
             amount: Number(amount),
             type: type.trim().toUpperCase() === 'CREDIT' ? TransactionType.CREDIT : TransactionType.DEBIT,
             category: category || 'General',
             description: desc || 'Imported'
           });
           count++;
        }
      }
      alert(`Imported ${count} transactions.`);
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
             className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
           >
             <Upload size={16} />
             {isImporting ? 'Importing...' : 'Import CSV'}
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
             <Download size={16} />
             Export
           </button>
        </div>
      </div>

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
    </div>
  );
};

export default Ledger;