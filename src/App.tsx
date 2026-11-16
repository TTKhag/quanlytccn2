import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { Toast, LoadingSpinner } from './components/common/Modal';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Debts from './pages/Debts';
import LoansAndLending from './pages/LoansAndLending';
import Funds from './pages/Funds';
import Interest from './pages/Interest';
import Planned from './pages/Planned';
import Reports from './pages/Reports';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';

const AppContent: React.FC = () => {
  const { loading, notification, setNotification } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-sm text-ink-muted mt-4 font-serif">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/loans" element={<LoansAndLending />} />
        <Route path="/funds" element={<Funds />} />
        <Route path="/interest" element={<Interest />} />
        <Route path="/planned" element={<Planned />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <Toast notification={notification} onDismiss={() => setNotification(null)} />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </HashRouter>
  );
};

export default App;
