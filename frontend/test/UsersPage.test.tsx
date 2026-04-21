import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UsersPage } from '@/pages/admin/UsersPage';

const getMock = vi.fn();
const patchMock = vi.fn();
const deleteMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/config/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string; role: string } }) => unknown) =>
    selector({ user: { id: 'admin-1', role: 'admin' } }),
}));

vi.mock('@/pages/admin/UserFormModal', () => ({
  UserFormModal: () => null,
}));

vi.mock('@/pages/admin/ResetPasswordModal', () => ({
  ResetPasswordModal: () => null,
}));

vi.mock('@/pages/admin/UserDetailsModal', () => ({
  UserDetailsModal: () => null,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <UsersPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('muestra estado vacio cuando no hay usuarios', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 15, totalPages: 1 },
      },
    });

    renderPage();

    expect(await screen.findByText('Sin usuarios')).toBeInTheDocument();
  });

  it('activa un usuario deshabilitado desde el menu de acciones', async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 'u-1',
            name: 'Maria Admin',
            email: 'maria@test.dev',
            role: 'viewer',
            status: 'disabled',
            department: 'Soporte',
            branch: null,
            lastLoginAt: null,
          },
        ],
        pagination: { total: 1, page: 1, limit: 15, totalPages: 1 },
      },
    });
    patchMock.mockResolvedValueOnce({ data: { success: true } });

    renderPage();

    const userNameCell = await screen.findByText('Maria Admin');
    const row = userNameCell.closest('tr');
    const menuButton = row?.querySelector('button');
    expect(menuButton).toBeTruthy();
    await userEvent.click(menuButton as HTMLButtonElement);
    await userEvent.click(await screen.findByRole('button', { name: /Activar/i }));

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/users/u-1/status', { status: 'active' });
      expect(toast.success).toHaveBeenCalledWith('Estado actualizado');
    });
  });

  it('procesa la importacion de un archivo CSV', async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 15, totalPages: 1 },
      },
    });
    postMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: { created: 1, updated: 2, unchanged: 0, failed: 0, rejectedRows: [] },
      },
    });

    renderPage();

    const file = new File(['name,email,role,status,department,branchId,companyPhone,auxiliaryPhone\nJuan,juan@test.com,viewer,active,,,,'], 'users.csv', { type: 'text/csv' });
    const input = screen.getByTestId('csv-upload-input') as HTMLInputElement;
    
    // El input está hidden, pero podemos interactuar con él si lo encontramos
    expect(input).toBeTruthy();
    
    await userEvent.upload(input!, file);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/users/import', expect.any(FormData), expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' }
      }));
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Importación completada'));
    });
  });
});
