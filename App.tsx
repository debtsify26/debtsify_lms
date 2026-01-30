import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Loans from './components/Loans';
import Installments from './components/Installments';
import Ledger from './components/Ledger';
import AIAnalyst from './components/AIAnalyst';
import AuthScreen from './components/AuthScreen';
import { View } from './types';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [currentView, setView] = useState<View>('DASHBOARD');

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Debtsify...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show main app if authenticated
  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'LOANS': return <Loans />;
      case 'INSTALLMENTS': return <Installments />;
      case 'LEDGER': return <Ledger />;
      case 'AI_ANALYST': return <AIAnalyst />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setView} userName={user?.full_name || 'User'}>
      {renderView()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;