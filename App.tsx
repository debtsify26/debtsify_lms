import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Loans from './components/Loans';
import Installments from './components/Installments';
import Ledger from './components/Ledger';
import AIAnalyst from './components/AIAnalyst';
import { View } from './types';

const AppContent: React.FC = () => {
  const [currentView, setView] = useState<View>('DASHBOARD');
  const { resetData } = useData();

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
    <Layout currentView={currentView} setView={setView} onReset={resetData}>
      {renderView()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;