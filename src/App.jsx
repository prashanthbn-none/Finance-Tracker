import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext.jsx';
import { DataProvider } from './store/DataContext.jsx';
import { SettingsProvider } from './store/SettingsContext.jsx';
import AppShell from './components/AppShell.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LedgerPage from './pages/LedgerPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import GoalsPage from './pages/GoalsPage.jsx';
import RecurringPage from './pages/RecurringPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

function Gate() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)' }}>
        Loading…
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <DataProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/income" element={<LedgerPage type="income" />} />
          <Route path="/expenses" element={<LedgerPage type="expense" />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
