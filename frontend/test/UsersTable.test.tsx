import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersTable } from '@/components/users/UsersTable';
import type { User } from '@/types';

const mockUsers: User[] = [
  {
    id: '1', name: 'Juan Pérez', email: 'juan@test.com', role: { name: 'admin' }, status: 'active',
    employeeId: 'EMP001', department: { id: 'dept-1', name: 'Seguridad', code: 'SEG' }, createdAt: '2024-01-01T00:00:00Z',
    branch: { id: 'b1', name: 'Sede Central', code: 'SC', isActive: true },
    lastLoginAt: '2024-06-15T10:00:00Z',
  } as User,
  {
    id: '2', name: 'María López', email: 'maria@test.com', role: { name: 'employee' }, status: 'disabled',
    employeeId: 'EMP002', department: { id: 'dept-2', name: 'Operaciones', code: 'OPS' }, createdAt: '2024-02-01T00:00:00Z',
    branch: { id: 'b2', name: 'Sucursal Norte', code: 'SN', isActive: true },
    lastLoginAt: undefined,
  } as User,
];

describe('UsersTable', () => {
  it('renderiza filas de usuarios con nombre y email', () => {
    render(
      <UsersTable
        data={mockUsers}
        sortBy="createdAt"
        sortOrder="desc"
        onSortChange={vi.fn()}
        onMenuToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('Juan Pérez')).toBeDefined();
    expect(screen.getByText('juan@test.com')).toBeDefined();
    expect(screen.getByText('María López')).toBeDefined();
    expect(screen.getByText('maria@test.com')).toBeDefined();
  });

  it('muestra el badge de rol correcto', () => {
    render(
      <UsersTable
        data={mockUsers}
        sortBy="createdAt"
        sortOrder="desc"
        onSortChange={vi.fn()}
        onMenuToggle={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Administrador').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Usuario').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el badge de estado correcto', () => {
    render(
      <UsersTable
        data={mockUsers}
        sortBy="createdAt"
        sortOrder="desc"
        onSortChange={vi.fn()}
        onMenuToggle={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Activo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Deshabilitado').length).toBeGreaterThanOrEqual(1);
  });

  it('llama a onSortChange al hacer clic en cabecera Usuario', async () => {
    const onSortChange = vi.fn();
    render(
      <UsersTable
        data={mockUsers}
        sortBy="createdAt"
        sortOrder="desc"
        onSortChange={onSortChange}
        onMenuToggle={vi.fn()}
      />,
    );

    const headers = screen.getAllByRole('button');
    const nameHeader = headers.find((h) => h.textContent?.includes('Usuario'));
    expect(nameHeader).toBeDefined();
    if (nameHeader) {
      await userEvent.click(nameHeader);
      expect(onSortChange).toHaveBeenCalledWith('name');
    }
  });

  it('llama a onSortChange al hacer clic en cabecera Departamento', async () => {
    const onSortChange = vi.fn();
    render(
      <UsersTable
        data={mockUsers}
        sortBy="createdAt"
        sortOrder="desc"
        onSortChange={onSortChange}
        onMenuToggle={vi.fn()}
      />,
    );

    const headers = screen.getAllByRole('button');
    const deptHeader = headers.find((h) => h.textContent?.includes('Departamento'));
    expect(deptHeader).toBeDefined();
    if (deptHeader) {
      await userEvent.click(deptHeader);
      expect(onSortChange).toHaveBeenCalledWith('department');
    }
  });

  it('llama a onSortChange al hacer clic en cabecera Sucursal', async () => {
    const onSortChange = vi.fn();
    render(
      <UsersTable
        data={mockUsers}
        sortBy="createdAt"
        sortOrder="desc"
        onSortChange={onSortChange}
        onMenuToggle={vi.fn()}
      />,
    );

    const headers = screen.getAllByRole('button');
    const branchHeader = headers.find((h) => h.textContent?.includes('Sucursal'));
    expect(branchHeader).toBeDefined();
    if (branchHeader) {
      await userEvent.click(branchHeader);
      expect(onSortChange).toHaveBeenCalledWith('branch');
    }
  });

  it('llama a onMenuToggle al hacer clic en botón de menú', async () => {
    const onMenuToggle = vi.fn();
    const { container } = render(
      <UsersTable
        data={mockUsers}
        sortBy="createdAt"
        sortOrder="desc"
        onSortChange={vi.fn()}
        onMenuToggle={onMenuToggle}
      />,
    );

    const menuButton = container.querySelector('button:has(svg)');
    expect(menuButton).not.toBeNull();
    if (menuButton) {
      await userEvent.click(menuButton);
      expect(onMenuToggle).toHaveBeenCalled();
    }
  });

  it('muestra el ID de empleado en desktop', () => {
    render(
      <UsersTable
        data={mockUsers}
        sortBy="createdAt"
        sortOrder="desc"
        onSortChange={vi.fn()}
        onMenuToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('EMP001')).toBeDefined();
    expect(screen.getByText('EMP002')).toBeDefined();
  });
});
