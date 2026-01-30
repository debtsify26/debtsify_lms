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
  User
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
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
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
          <NavItem view="AI_ANALYST" current={currentView} label="AI Analyst" icon={Bot} onClick={setView} />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-4 py-2 text-slate-300">
            <User size={16} className="text-primary-400" />
            <span className="text-sm truncate">{userName}</span>
          </div>
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


    </div>
  );
};

export default Layout;