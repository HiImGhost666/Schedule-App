import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/config/queryClient';
import api from '@/config/api';
import { ProtectedRoute, RoleGuard } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';
import { getEffectiveDisplayTheme, useUIStore } from '@/store/uiStore';
import type { ThemeConfig } from '@/types';
import { applyFavicon } from '@/lib/favicon';

const QueryInvalidationBridge = lazy(() =>
  import('@/realtime/queryInvalidationBridge').then((m) => ({ default: m.QueryInvalidationBridge }))
);

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SchedulePage = lazy(() => import('@/pages/SchedulePage').then((m) => ({ default: m.SchedulePage })));
const VacationsPage = lazy(() => import('@/pages/VacationsPage').then((m) => ({ default: m.VacationsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })));
const WebhooksPage = lazy(() => import('@/pages/admin/WebhooksPage').then((m) => ({ default: m.WebhooksPage })));
const NotificationsPage = lazy(() =>
  import('@/pages/admin/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const EventTypesPage = lazy(() =>
  import('@/pages/admin/EventTypesPage').then((m) => ({ default: m.EventTypesPage }))
);
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const ThemeManagerPage = lazy(() =>
  import('@/pages/admin/ThemeManagerPage').then((m) => ({ default: m.ThemeManagerPage }))
);
const BranchesPage = lazy(() => import('@/pages/admin/BranchesPage').then((m) => ({ default: m.BranchesPage })));
const DepartmentsPage = lazy(() => import('@/pages/admin/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })));
const HolidaysPage = lazy(() => import('@/pages/admin/HolidaysPage').then((m) => ({ default: m.HolidaysPage })));
const ShiftPresetsPage = lazy(() => import('@/pages/admin/ShiftPresetsPage').then((m) => ({ default: m.default })));

const THEME_MANAGER_PATH = '/admin/theme';

/** Quitar previsualización de tema (borrador + hover) al navegar fuera de Apariencia. */
function ClearThemeManagerPreviewOnRouteChange() {
  const location = useLocation();
  const prev = useRef(location.pathname);
  const { setThemeDraft, setThemePresetHoverPreview } = useUIStore();

  useEffect(() => {
    if (prev.current === THEME_MANAGER_PATH && location.pathname !== THEME_MANAGER_PATH) {
      setThemePresetHoverPreview(null);
      setThemeDraft(null);
    }
    prev.current = location.pathname;
  }, [location.pathname, setThemeDraft, setThemePresetHoverPreview]);
  return null;
}

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);
  const logout = useAuthStore((s) => s.logout);
  const activeTheme = useUIStore((s) => getEffectiveDisplayTheme(s));
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

    // Sync site branding (title + favicon)
    api
      .get<{ data: { title: string; faviconUrl: string } }>('/settings/site')
      .then((response) => {
        document.title = response.data.data.title;
        applyFavicon(response.data.data.faviconUrl, { cacheBust: true });
      })
      .catch(() => {});
  }, [isAuthenticated, setThemeConfig]);

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthenticated ? (
        <Suspense fallback={null}>
          <QueryInvalidationBridge />
        </Suspense>
      ) : null}
      <BrowserRouter>
        <ClearThemeManagerPreviewOnRouteChange />
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-navy-50">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
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
                <Route path="vacaciones" element={<VacationsPage />} />
                <Route path="profile" element={<ProfilePage />} />

                {/* Admin routes */}
                <Route element={<RoleGuard roles={['admin', 'general_manager', 'department_manager']} />}>
                  <Route path="admin/users" element={<UsersPage />} />
                  <Route path="admin/event-types" element={<EventTypesPage />} />
                </Route>
                <Route element={<RoleGuard roles={['admin', 'general_manager']} />}>
                  <Route path="admin/holidays" element={<HolidaysPage />} />
                  <Route path="admin/notifications" element={<NotificationsPage />} />
                </Route>
                <Route element={<RoleGuard roles={['admin']} />}>
                  <Route path="admin/branches" element={<BranchesPage />} />
                  <Route path="admin/departments" element={<DepartmentsPage />} />
                  <Route path="admin/webhooks" element={<WebhooksPage />} />
                  <Route path="admin/audit" element={<AuditLogPage />} />
                  <Route path="admin/theme" element={<ThemeManagerPage />} />
                  <Route path="admin/shift-presets" element={<ShiftPresetsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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