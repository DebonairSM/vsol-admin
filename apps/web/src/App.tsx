import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/use-auth';
import { Toaster } from './components/ui/toaster';
import LoginPage from './routes/login';
import DashboardPage from './routes/dashboard';
import NewCyclePage from './routes/new-cycle';
import GoldenSheetPage from './routes/golden-sheet';
import ConsultantsPage from './routes/consultants';
import ConsultantNewPage from './routes/consultant-new';
import ConsultantProfilePage from './routes/consultant-profile';
import ConsultantEditPage from './routes/consultant-edit';
import ConsultantShippingLabelPage from './routes/consultant-shipping-label';
import EquipmentPage from './routes/equipment';
import NewEquipmentPage from './routes/equipment-new';
import ClientInvoicesPage from './routes/client-invoices';
import ClientInvoiceDetailPage from './routes/client-invoice-detail';
import PaymentsPage from './routes/payments';
import AuditPage from './routes/audit';
import WorkHoursPage from './routes/work-hours';
import VacationsPage from './routes/vacations';
import SettingsPage from './routes/settings';
import PayoneerPayeesPage from './routes/payoneer-payees';
import TimeDoctorActivityPage from './routes/timedoctor-activity';
import ConsultantChangePasswordPage from './routes/consultant-change-password';
import ConsultantPortalPage from './routes/consultant-portal';
import ConsultantInvoicesPage from './routes/consultant-invoices';
import ConsultantMyProfilePage from './routes/consultant-my-profile';
import ConsultantEquipmentPage from './routes/consultant-equipment';
import ConsultantVacationsPage from './routes/consultant-vacations';
import UsersPage from './routes/users';
import Layout from './components/layout';
import ConsultantLayout from './components/consultant-layout';

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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (user?.role !== 'admin') {
    return <Navigate to="/consultant" replace />;
  }
  
  return <>{children}</>;
}

function ConsultantRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (user?.role !== 'consultant') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { user } = useAuth();

  return (
    <>
      <Routes>
        <Route 
          path="/login" 
          element={
            user 
              ? (user.role === 'consultant' 
                  ? (user.mustChangePassword 
                      ? <Navigate to="/consultant/change-password" replace /> 
                      : <Navigate to="/consultant" replace />)
                  : <Navigate to="/dashboard" replace />) 
              : <LoginPage />
          } 
        />
        {/* Password change route (no layout) */}
        <Route
          path="/consultant/change-password"
          element={
            <ProtectedRoute>
              <ConsultantChangePasswordPage />
            </ProtectedRoute>
          }
        />
        {/* Print-only route without Layout wrapper for clean printing */}
        <Route
          path="/consultants/:id/shipping-label"
          element={
            <ProtectedRoute>
              <ConsultantShippingLabelPage />
            </ProtectedRoute>
          }
        />
        {/* Consultant portal routes */}
        <Route
          path="/consultant/*"
          element={
            <ProtectedRoute>
              <ConsultantRoute>
                <ConsultantLayout>
                  <Routes>
                    <Route index element={<ConsultantPortalPage />} />
                    <Route path="invoices" element={<ConsultantInvoicesPage />} />
                    <Route path="profile" element={<ConsultantMyProfilePage />} />
                    <Route path="equipment" element={<ConsultantEquipmentPage />} />
                    <Route path="vacations" element={<ConsultantVacationsPage />} />
                  </Routes>
                </ConsultantLayout>
              </ConsultantRoute>
            </ProtectedRoute>
          }
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
                  <Route path="/consultants/new" element={<ConsultantNewPage />} />
                  <Route path="/consultants/:id" element={<ConsultantProfilePage />} />
                  <Route path="/consultants/:id/edit" element={<ConsultantEditPage />} />
                  <Route path="/equipment" element={<EquipmentPage />} />
                  <Route path="/equipment/new" element={<NewEquipmentPage />} />
                  <Route path="/client-invoices" element={<ClientInvoicesPage />} />
                  <Route path="/client-invoices/:id" element={<ClientInvoiceDetailPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/work-hours" element={<WorkHoursPage />} />
                  <Route path="/vacations" element={<VacationsPage />} />
                  <Route path="/audit" element={<AuditPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/payoneer/payees" element={<PayoneerPayeesPage />} />
                  <Route path="/timedoctor/activity" element={<TimeDoctorActivityPage />} />
                  <Route 
                    path="/users" 
                    element={
                      <AdminRoute>
                        <UsersPage />
                      </AdminRoute>
                    } 
                  />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
