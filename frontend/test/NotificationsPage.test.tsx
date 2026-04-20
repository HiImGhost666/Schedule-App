import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { NotificationsPage } from '@/pages/admin/NotificationsPage';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/config/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
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
    <QueryClientProvider client={queryClient}>
      <NotificationsPage />
    </QueryClientProvider>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('muestra estado vacio cuando no hay notificaciones', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
      },
    });

    renderPage();

    expect(await screen.findByText('Sin notificaciones')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/notifications/logs', { params: { page: 1, limit: 20 } });
  });

  it('permite reenviar una notificacion fallida', async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 'log-1',
            type: 'manual_announcement',
            message: 'Error temporal',
            status: 'failed',
            sentAt: '2026-04-20T08:00:00.000Z',
            webhookConfig: { id: 'wh-1', name: 'Ops' },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });
    postMock.mockResolvedValueOnce({ data: { success: true } });

    renderPage();

    const resendText = await screen.findByText('Reenviar');
    const resendButton = resendText.closest('button');
    expect(resendButton).toBeTruthy();
    await userEvent.click(resendButton as HTMLButtonElement);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/notifications/resend/log-1');
      expect(toast.success).toHaveBeenCalledWith('Notificación reenviada');
    });
  });
});
