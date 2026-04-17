/**
 * @file auth.test.ts
 * Tests del motor de autenticación: lockouts, cuentas deshabilitadas, rotación de tokens.
 */

// ── Mocks antes de imports ──────────────────────────────────────────────────
jest.mock('../src/modules/users/users.repository');
jest.mock('../src/modules/auth/auth.repository');
jest.mock('../src/utils/bcrypt', () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed'),
}));
// Evitar que jwt real intente leer secrets
jest.mock('../src/utils/jwt', () => ({
  signAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: jest.fn(),
}));

import * as usersRepo from '../src/modules/users/users.repository';
import * as authRepo from '../src/modules/auth/auth.repository';
import * as bcryptUtils from '../src/utils/bcrypt';
import { login } from '../src/modules/auth/auth.service';
import { USER_STATUS, MAX_FAILED_ATTEMPTS } from '../src/config/constants';

const mockUsersRepo = usersRepo as jest.Mocked<typeof usersRepo>;
const mockAuthRepo = authRepo as jest.Mocked<typeof authRepo>;
const mockBcrypt = bcryptUtils as jest.Mocked<typeof bcryptUtils>;

// ── Helper ───────────────────────────────────────────────────────────────────
const buildUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-1',
  email: 'user@test.com',
  name: 'Test',
  role: 'viewer',
  status: USER_STATUS.ACTIVE,
  failedAttempts: 0,
  passwordHash: 'hashed',
  lockedUntil: null,
  avatarUrl: null,
  department: null,
  createdAt: new Date(),
  lastLoginAt: null,
  forcePasswordChange: false,
  islandCalendar: 'none',
  companyPhone: null,
  auxiliaryPhone: null,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('login - Seguridad y Valores Límite', () => {
  beforeEach(() => {
    mockAuthRepo.createRefreshToken.mockResolvedValue(undefined as any);
    mockAuthRepo.updateUserById.mockResolvedValue(undefined as any);
  });

  // ── Caso: Credenciales inválidas — usuario no existe ────────────────────────
  it('lanza UNAUTHORIZED genérico si el usuario no existe (protección de enumeración)', async () => {
    mockUsersRepo.findUserByEmail.mockResolvedValue(null as any);

    await expect(login('ghost@test.com', 'password', '127.0.0.1'))
      .rejects.toThrow('Credenciales incorrectas');
  });

  // ── Caso: Cuenta DISABLED — acceso denegado independientemente de la password ─
  it('rechaza el acceso de una cuenta deshabilitada antes de verificar la password', async () => {
    mockUsersRepo.findUserByEmail.mockResolvedValue(
      buildUser({ status: USER_STATUS.DISABLED }) as any
    );

    await expect(login('user@test.com', 'AnyPass1!', '127.0.0.1'))
      .rejects.toThrow('Cuenta deshabilitada. Contacta con el administrador');

    // La password NO debe haberse comprobado (optimización de seguridad)
    expect(mockBcrypt.comparePassword).not.toHaveBeenCalled();
  });

  // ── Caso: Contraseña incorrecta → incrementa failedAttempts ─────────────────
  it('incrementa failedAttempts en BD tras una contraseña incorrecta', async () => {
    mockUsersRepo.findUserByEmail.mockResolvedValue(buildUser({ failedAttempts: 1 }) as any);
    mockBcrypt.comparePassword.mockResolvedValue(false as never);

    await expect(login('user@test.com', 'WrongPass!', '127.0.0.1'))
      .rejects.toThrow('Credenciales incorrectas');

    expect(mockAuthRepo.updateUserById).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ failedAttempts: 2 })
    );
  });

  // ── Caso: Valor límite — al llegar a MAX_FAILED_ATTEMPTS se activa LOCKED ───
  it(`bloquea la cuenta al alcanzar exactamente ${MAX_FAILED_ATTEMPTS} intentos fallidos`, async () => {
    // El usuario ya tiene MAX-1 intentos → este será el decisivo
    mockUsersRepo.findUserByEmail.mockResolvedValue(
      buildUser({ failedAttempts: MAX_FAILED_ATTEMPTS - 1 }) as any
    );
    mockBcrypt.comparePassword.mockResolvedValue(false as never);

    await expect(login('user@test.com', 'WrongPass!', '127.0.0.1'))
      .rejects.toThrow('Credenciales incorrectas');

    expect(mockAuthRepo.updateUserById).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ status: USER_STATUS.LOCKED })
    );
  });

  // ── Caso: Login exitoso — resetea intentos fallidos ─────────────────────────
  it('resetea failedAttempts a 0 y actualiza lastLoginAt tras login correcto', async () => {
    mockUsersRepo.findUserByEmail.mockResolvedValue(buildUser() as any);
    mockBcrypt.comparePassword.mockResolvedValue(true as never);

    const result = await login('user@test.com', 'CorrectPass!', '127.0.0.1');

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(mockAuthRepo.updateUserById).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ failedAttempts: 0 })
    );
  });

  // ── Caso: Cuenta bloqueada con lockedUntil en el futuro — deniega acceso ────
  it('deniega acceso a cuenta bloqueada cuyo lockedUntil está en el futuro', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // +1 hora
    mockUsersRepo.findUserByEmail.mockResolvedValue(
      buildUser({ status: USER_STATUS.LOCKED, lockedUntil: futureDate }) as any
    );

    await expect(login('user@test.com', 'AnyPass!', '127.0.0.1'))
      .rejects.toThrow(/Cuenta bloqueada/);
  });
});
