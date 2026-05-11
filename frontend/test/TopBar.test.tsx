/**
 * @file TopBar.test.tsx
 * Tests del componente TopBar.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';

const mockUser = {
  id: 'u1',
  name: 'Juan Pérez',
  role: { name: 'admin' },
};

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: typeof mockUser }) => unknown) =>
    selector({ user: mockUser }),
}));

vi.mock('@/hooks/useInAppNotifications', () => ({
  useInAppNotifications: () => ({
    unreadCount: 0,
    notifications: [],
    loading: false,
    pagination: { page: 1, total: 0, totalPages: 0 },
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

function renderTopBar(title?: string) {
  return render(
    <MemoryRouter>
      <TopBar title={title} />
    </MemoryRouter>,
  );
}

describe('TopBar', () => {
  it('renderiza nombre de usuario', () => {
    renderTopBar();

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('renderiza título cuando se proporciona', () => {
    renderTopBar('Dashboard');

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('no renderiza título cuando no se proporciona', () => {
    renderTopBar();

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renderiza el panel de notificaciones', () => {
    renderTopBar();

    expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument();
  });
});
