import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/auth-context';
import LoginPage from './routes/login';
import DashboardPage from './routes/dashboard';
import NewCyclePage from './routes/new-cycle';
import GoldenSheetPage from './routes/golden-sheet';
import ConsultantsPage from './routes/consultants';
import ConsultantProfilePage from './routes/consultant-profile';
import ConsultantEditPage from './routes/consultant-edit';
import EquipmentPage from './routes/equipment';
import NewEquipmentPage from './routes/equipment-new';
import InvoicesPage from './routes/invoices';
import PaymentsPage from './routes/payments';
import AuditPage from './routes/audit';
import WorkHoursPage from './routes/work-hours';
import SettingsPage from './routes/settings';
import Layout from './components/layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/cycles/new" element={<NewCyclePage />} />
                  <Route path="/cycles/:id" element={<GoldenSheetPage />} />
                  <Route path="/consultants" element={<ConsultantsPage />} />
                  <Route path="/consultants/:id" element={<ConsultantProfilePage />} />
                  <Route path="/consultants/:id/edit" element={<ConsultantEditPage />} />
                  <Route path="/equipment" element={<EquipmentPage />} />
                  <Route path="/equipment/new" element={<NewEquipmentPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/work-hours" element={<WorkHoursPage />} />
                  <Route path="/audit" element={<AuditPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
