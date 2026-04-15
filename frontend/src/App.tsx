import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/config/queryClient';
import api from '@/config/api';
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
import { ThemeManagerPage } from '@/pages/admin/ThemeManagerPage';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import type { ThemeConfig } from '@/types';

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);
  const logout = useAuthStore((s) => s.logout);
  const activeTheme = useUIStore((s) => s.themeDraft || s.themeConfig);
  const setThemeConfig = useUIStore((s) => s.setThemeConfig);
  const authBootstrappedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      authBootstrappedRef.current = false;
      return;
    }
    if (authBootstrappedRef.current) return;
    authBootstrappedRef.current = true;

    const bootstrap = async () => {
      if (!accessToken && refreshToken) {
        setBootstrapping(true);
        try {
          const { data } = await import('axios').then((m) =>
            m.default.post('/api/auth/refresh', { refreshToken })
          );
          setTokens(data.data.accessToken, data.data.refreshToken ?? refreshToken);
        } catch {
          logout();
          return;
        }
      }

      api
        .get('/auth/me')
        .then((response) => {
          setUser(response.data.data);
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setBootstrapping(false);
        });
    };

    bootstrap();
  }, [isAuthenticated, accessToken, refreshToken, logout, setUser, setTokens, setBootstrapping]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Sync theme settings
    api
      .get<{ data: ThemeConfig }>('/settings/theme')
      .then((response) => {
        setThemeConfig(response.data.data);
      })
      .catch(() => {
        // Keep local fallback theme
      });
  }, [isAuthenticated, setThemeConfig]);

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
              <Route path="schedule/:scheduleId" element={<SchedulePage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Admin routes */}
              <Route element={<RoleGuard roles={['admin', 'manager']} />}>
                <Route path="admin/users" element={<UsersPage />} />
              </Route>
              <Route element={<RoleGuard roles={['admin']} />}>
                <Route path="admin/webhooks" element={<WebhooksPage />} />
                <Route path="admin/notifications" element={<NotificationsPage />} />
                <Route path="admin/audit" element={<AuditLogPage />} />
                <Route path="admin/theme" element={<ThemeManagerPage />} />
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
            background: activeTheme.overrides.toasts.background,
            color: activeTheme.overrides.toasts.text,
            fontSize: '13px',
            fontWeight: '500',
            borderRadius: '10px',
          },
          success: {
            iconTheme: {
              primary: activeTheme.overrides.toasts.successPrimary,
              secondary: activeTheme.overrides.toasts.successSecondary,
            },
          },
          error: {
            style: {
              background: activeTheme.overrides.toasts.errorBackground,
              color: activeTheme.overrides.toasts.errorText,
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
