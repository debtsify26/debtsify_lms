import React, { useState } from 'react';
import { View } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  Bot,
  Menu,
  X,
  LogOut,
  User,
  Landmark,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface LayoutProps {
  currentView: View;
  setView: (view: View) => void;
  children: React.ReactNode;
  userName?: string;
}

const NavItem = ({
  view,
  current,
  label,
  icon: Icon,
  onClick
}: {
  view: View;
  current: View;
  label: string;
  icon: any;
  onClick: (v: View) => void;
}) => (
  <button
    onClick={() => onClick(view)}
    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${current === view
      ? 'bg-primary-600 text-white shadow-md'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, userName = 'User' }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [syncNotification, setSyncNotification] = useState<{ show: boolean, message: string, url?: string }>({ show: false, message: '' });
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  const handleSync = async (createArchive: boolean = false) => {
    setIsSyncing(true);
    try {
      const { syncAPI } = await import('../services/api');
      const result = await syncAPI.syncData(createArchive);

      // Store the spreadsheet URL if available
      if (result.spreadsheet_url) {
        setSpreadsheetUrl(result.spreadsheet_url);
        setSyncNotification({
          show: true,
          message: result.message || 'Sync started successfully!',
          url: result.spreadsheet_url
        });
      } else {
        setSyncNotification({
          show: true,
          message: result.message || 'Sync started successfully!'
        });
      }
    } catch (err: any) {
      setSyncNotification({
        show: true,
        message: `Sync failed: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-full border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-primary-400 tracking-tight">Debtsify<span className="text-white">.</span></h1>
          <p className="text-xs text-slate-500 mt-1">Loan Management System</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="DASHBOARD" current={currentView} label="Dashboard" icon={LayoutDashboard} onClick={setView} />
          <NavItem view="LOANS" current={currentView} label="Loans" icon={Users} onClick={setView} />
          <NavItem view="INSTALLMENTS" current={currentView} label="Schedule" icon={CalendarDays} onClick={setView} />
          <NavItem view="LEDGER" current={currentView} label="Ledger" icon={BookOpen} onClick={setView} />
          <NavItem view="INVESTMENT_ANALYTICS" current={currentView} label="Market Analytics" icon={Landmark} onClick={setView} />
          <NavItem view="AI_ANALYST" current={currentView} label="AI Analyst" icon={Bot} onClick={setView} />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-4 py-2 text-slate-300">
            <User size={16} className="text-primary-400" />
            <span className="text-sm truncate">{userName}</span>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-3 w-full px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
          </button>

          <button
            onClick={() => handleSync(true)}
            disabled={isSyncing}
            className="flex items-center gap-3 w-full px-4 py-2 text-emerald-300 hover:text-emerald-200 transition-colors text-sm disabled:opacity-50"
            title="Create a monthly archive snapshot"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Archiving...' : 'Monthly Archive'}
          </button>

          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-2 text-blue-300 hover:text-blue-200 transition-colors text-sm bg-blue-900/20 rounded-lg"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
              <span className="text-xs">Open Google Sheet</span>
            </a>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-red-400 hover:text-red-300 transition-colors text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-50 flex items-center justify-between p-4 shadow-md">
        <span className="font-bold text-lg text-primary-400">Debtsify.</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900 z-40 pt-20 px-4 space-y-4">
          <NavItem view="DASHBOARD" current={currentView} label="Dashboard" icon={LayoutDashboard} onClick={(v) => { setView(v); setIsMobileMenuOpen(false) }} />
          <NavItem view="LOANS" current={currentView} label="Loans" icon={Users} onClick={(v) => { setView(v); setIsMobileMenuOpen(false) }} />
          <NavItem view="INSTALLMENTS" current={currentView} label="Schedule" icon={CalendarDays} onClick={(v) => { setView(v); setIsMobileMenuOpen(false) }} />
          <NavItem view="LEDGER" current={currentView} label="Ledger" icon={BookOpen} onClick={(v) => { setView(v); setIsMobileMenuOpen(false) }} />
          <NavItem view="INVESTMENT_ANALYTICS" current={currentView} label="Market Analytics" icon={Landmark} onClick={(v) => { setView(v); setIsMobileMenuOpen(false) }} />
          <NavItem view="AI_ANALYST" current={currentView} label="AI Analyst" icon={Bot} onClick={(v) => { setView(v); setIsMobileMenuOpen(false) }} />
          <div className="pt-8 border-t border-slate-800 mt-4 space-y-4">
            <div className="flex items-center gap-3 px-4 py-2 text-white">
              <User size={20} className="text-primary-400" />
              <span className="truncate">{userName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-400 font-medium"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto h-full w-full pt-16 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* Sync Notification Modal */}
      {syncNotification.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Sync Status</h3>
            <p className="text-slate-700 mb-4 break-words">{syncNotification.message}</p>

            {syncNotification.url && (
              <a
                href={syncNotification.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg font-medium transition-colors mb-3"
              >
                📊 Open Google Sheet
              </a>
            )}

            <button
              onClick={() => setSyncNotification({ show: false, message: '' })}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;