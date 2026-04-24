import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import type { User } from '@/types';

const getMock = vi.fn();

const authState: {
  user: { id: string; role: 'admin' | 'manager' | 'viewer'; branchId?: string | null } | null;
} = {
  user: { id: 'admin-1', role: 'admin' },
};

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('@/store/uiStore', () => ({
  useUIStore: (selector: (state: { themeConfig: { preset: 'light' | 'dark' }; themeDraft: null }) => unknown) =>
    selector({
      themeConfig: { preset: 'light' },
      themeDraft: null,
    }),
}));

vi.mock('@/config/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

function renderModal(user: User) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UserProfileModal open user={user} onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

const baseUser: User = {
  id: 'u-1',
  employeeId: 'E-100',
  name: 'Usuario Perfil',
  email: 'perfil@example.com',
  role: 'viewer',
  status: 'active',
  createdAt: '2026-01-10T10:00:00.000Z',
  forcePasswordChange: false,
  branchId: 'b-1',
  branch: {
    id: 'b-1',
    name: 'Madrid',
    code: 'MAD01',
    isActive: true,
  },
};

describe('UserProfileModal access control', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('viewer solo puede ver la pestaña General', () => {
    authState.user = { id: 'viewer-1', role: 'viewer', branchId: 'b-1' };

    renderModal(baseUser);

    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardias' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seguridad' })).not.toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('manager de la misma sucursal puede ver todas las pestañas y cargar datos privados', async () => {
    authState.user = { id: 'manager-1', role: 'manager', branchId: 'b-1' };

    getMock.mockImplementation((url: string) => {
      if (url === '/users/u-1') {
        return Promise.resolve({ data: { data: baseUser } });
      }
      if (url === '/users/u-1/schedules') {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderModal(baseUser);

    expect(screen.getByRole('button', { name: 'Guardias' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguridad' })).toBeInTheDocument();

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/users/u-1');
      expect(getMock).toHaveBeenCalledWith('/users/u-1/schedules');
    });
  });

  it('usuario con sucursal no puede ver perfiles de otra sucursal', () => {
    authState.user = { id: 'manager-2', role: 'manager', branchId: 'b-1' };

    renderModal({
      ...baseUser,
      id: 'u-2',
      branchId: 'b-2',
      branch: {
        id: 'b-2',
        name: 'Barcelona',
        code: 'BCN02',
        isActive: true,
      },
    });

    expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
    expect(screen.getByText('No puedes ver perfiles de usuarios de otra sucursal.')).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('admin puede ver perfiles de cualquier sucursal', async () => {
    authState.user = { id: 'admin-2', role: 'admin', branchId: 'b-1' };

    getMock.mockImplementation((url: string) => {
      if (url === '/users/u-3') {
        return Promise.resolve({
          data: {
            data: {
              ...baseUser,
              id: 'u-3',
              branchId: 'b-2',
              branch: { id: 'b-2', name: 'Barcelona', code: 'BCN02', isActive: true },
            },
          },
        });
      }
      if (url === '/users/u-3/schedules') {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderModal({
      ...baseUser,
      id: 'u-3',
      branchId: 'b-2',
      branch: {
        id: 'b-2',
        name: 'Barcelona',
        code: 'BCN02',
        isActive: true,
      },
    });

    expect(screen.queryByText('Acceso restringido')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardias' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguridad' })).toBeInTheDocument();

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/users/u-3');
      expect(getMock).toHaveBeenCalledWith('/users/u-3/schedules');
    });
  });
});
