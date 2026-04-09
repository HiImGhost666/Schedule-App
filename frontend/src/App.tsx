import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/config/queryClient';
import { ProtectedRoute, RoleGuard } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { WebhooksPage } from '@/pages/admin/WebhooksPage';
import { NotificationsPage } from '@/pages/admin/NotificationsPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { useAuthStore } from '@/store/authStore';

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Admin routes */}
              <Route element={<RoleGuard roles={['admin', 'manager']} />}>
                <Route path="admin/users" element={<UsersPage />} />
              </Route>
              <Route element={<RoleGuard roles={['admin']} />}>
                <Route path="admin/webhooks" element={<WebhooksPage />} />
                <Route path="admin/notifications" element={<NotificationsPage />} />
                <Route path="admin/audit" element={<AuditLogPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e3a5f',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '500',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#f5c518', secondary: '#1e3a5f' } },
          error: { style: { background: '#7f1d1d', color: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
