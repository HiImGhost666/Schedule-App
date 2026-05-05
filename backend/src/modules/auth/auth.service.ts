import { comparePassword } from '../../utils/bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import {
  LOGIN_LOCKOUT_DISABLE_ATTEMPTS,
  LOGIN_LOCKOUT_FIRST_ATTEMPTS,
  LOGIN_LOCKOUT_FIRST_MINUTES,
  LOGIN_LOCKOUT_SECOND_ATTEMPTS,
  LOGIN_LOCKOUT_SECOND_MINUTES,
  USER_STATUS,
} from '../../config/constants';
import { addMinutes, isAfter } from 'date-fns';
import crypto from 'crypto';
import { findUserByEmailOrUsername } from '../users/users.service';
import {
  createRefreshToken,
  findRefreshTokenByToken,
  findUserById,
  findUserProfileById,
  revokeRefreshTokenById,
  revokeRefreshTokensByToken,
  updateUserById,
} from './auth.repository';
import { createAppError } from '../../common/errors/error-catalog';
import { hashPassword } from '../../utils/bcrypt';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import {
  buildClearedPasswordChangeFields,
  getPolicyTransitionPatch,
  resolvePasswordChangeState,
} from './password-change-policy';

/**
 * @description Evalúa credenciales de usuario (email/username), maneja bloqueos decrecientes (lockouts) y emite token JWT y Refresh Token.
 * @param identifier @param password @param ipAddress @param userAgent
 */
export async function login(identifier: string, password: string, ipAddress?: string, userAgent?: string) {
  const user = await findUserByEmailOrUsername(identifier);

  if (!user) {
    throw createAppError('UNAUTHORIZED', 'Credenciales incorrectas');
  }

  if (user.status === USER_STATUS.DISABLED) {
    throw createAppError('UNAUTHORIZED', 'Cuenta deshabilitada. Contacta con el administrador');
  }

  if (user.status === USER_STATUS.LOCKED && user.lockedUntil) {
    if (isAfter(new Date(), user.lockedUntil)) {
      // Fin del bloqueo temporal: se puede volver a intentar; los intentos fallidos se mantienen hasta un login correcto.
      await updateUserById(user.id, { status: USER_STATUS.ACTIVE, lockedUntil: null });
    } else {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw createAppError('UNAUTHORIZED', `Cuenta bloqueada. Inténtalo de nuevo en ${minutesLeft} minuto(s)`);
    }
  }

  const passwordValid = await comparePassword(password, user.passwordHash);

  if (!passwordValid) {
    const newAttempts = user.failedAttempts + 1;
    const updates: Parameters<typeof updateUserById>[1] = { failedAttempts: newAttempts };

    if (newAttempts >= LOGIN_LOCKOUT_DISABLE_ATTEMPTS) {
      updates.status = USER_STATUS.DISABLED;
      updates.lockedUntil = null;
      await updateUserById(user.id, updates);
      throw createAppError('UNAUTHORIZED', 'Cuenta deshabilitada. Contacta con el administrador');
    }
    if (newAttempts === LOGIN_LOCKOUT_SECOND_ATTEMPTS) {
      updates.status = USER_STATUS.LOCKED;
      updates.lockedUntil = addMinutes(new Date(), LOGIN_LOCKOUT_SECOND_MINUTES);
    } else if (newAttempts === LOGIN_LOCKOUT_FIRST_ATTEMPTS) {
      updates.status = USER_STATUS.LOCKED;
      updates.lockedUntil = addMinutes(new Date(), LOGIN_LOCKOUT_FIRST_MINUTES);
    }

    await updateUserById(user.id, updates);
    throw createAppError('UNAUTHORIZED', 'Credenciales incorrectas');
  }

  const policyUpgradePatch = getPolicyTransitionPatch(user);
  const successfulLoginPatch = {
    failedAttempts: 0,
    lastLoginAt: new Date(),
    ...(policyUpgradePatch ?? {}),
  };

  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, jti: tokenId });

  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  // Atomicidad: reset de intentos fallidos + creación de refresh token en una sola transacción
  const updatedUser = await executeInTransaction(async (tx) => {
    const updated = await updateUserById(user.id, successfulLoginPatch, tx);

    await createRefreshToken({
      id: tokenId,
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiry,
      ipAddress,
      userAgent,
    }, tx);

    return updated;
  });

  const userWithRole = updatedUser as any;
  const permissions = userWithRole.role?.permissions?.map((p: any) => p.name) || [];

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: userWithRole.role?.name || 'viewer',
    name: user.name,
    permissions,
  });

  const safeUser = {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: {
      name: userWithRole.role?.name || 'viewer',
      permissions: userWithRole.role?.permissions || []
    },

    permissions,
    status: updatedUser.status,
    avatarUrl: updatedUser.avatarUrl,
    department: updatedUser.department,
    createdAt: updatedUser.createdAt,
    lastLoginAt: updatedUser.lastLoginAt,
    failedAttempts: updatedUser.failedAttempts,
    forcePasswordChange: resolvePasswordChangeState(updatedUser) === 'required',
    passwordChangedAt: updatedUser.passwordChangedAt,
    passwordChangePolicy: updatedUser.passwordChangePolicy,
    passwordChangeState: resolvePasswordChangeState(updatedUser),
    passwordChangeWarnedAt: updatedUser.passwordChangeWarnedAt,
    passwordChangeDeadlineAt: updatedUser.passwordChangeDeadlineAt,
    companyPhone: updatedUser.companyPhone,
    auxiliaryPhone: updatedUser.auxiliaryPhone,
  };
  return { accessToken, refreshToken, user: safeUser };
}

/**
 * @description Revalida el acceso rotando el Refresh Token anterior por uno nuevo si el original sigue vigente e inviolado.
 * @param token
 */
export async function refreshTokens(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw createAppError('UNAUTHORIZED', 'Refresh token inválido o expirado');
  }

  const storedToken = await findRefreshTokenByToken(token);
  if (!storedToken || storedToken.revokedAt || isAfter(new Date(), storedToken.expiresAt)) {
    throw createAppError('UNAUTHORIZED', 'Refresh token inválido o expirado');
  }

  const user = await findUserById(payload.sub);
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw createAppError('UNAUTHORIZED', 'Usuario no disponible');
  }

  const newTokenId = crypto.randomUUID();
  const userWithRole = user as any;
  const permissions = userWithRole.role?.permissions?.map((p: any) => p.name) || [];

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: userWithRole.role?.name || 'viewer',
    name: user.name,
    permissions,
  });
  const newRefreshToken = signRefreshToken({ sub: user.id, jti: newTokenId });

  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  // Atomicidad: revocar token viejo + crear token nuevo en una sola transacción
  await executeInTransaction(async (tx) => {
    await revokeRefreshTokenById(storedToken.id, tx);
    await createRefreshToken({
      id: newTokenId,
      token: newRefreshToken,
      userId: user.id,
      expiresAt: refreshExpiry,
    }, tx);
  });

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * @description Fulmina de la base de datos el Refresh Token emitido, forzando la pérdida de persistencia de sesión del usuario.
 * @param token
 */
export async function logout(token: string) {
  await revokeRefreshTokensByToken(token);
}

/**
 * @description Entrega los detalles operacionales y el perfil extendido del usuario propietario del Token HTTP actual.
 * @param userId
 */
export async function getMe(userId: string) {
  const currentProfile = await findUserProfileById(userId);
  if (!currentProfile) {
    throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  }

  const policyUpgradePatch = getPolicyTransitionPatch(currentProfile);
  let user = currentProfile;

  if (policyUpgradePatch) {
    await updateUserById(userId, policyUpgradePatch);
    const refreshedProfile = await findUserProfileById(userId);
    if (!refreshedProfile) {
      throw createAppError('NOT_FOUND', 'Usuario no encontrado');
    }
    user = refreshedProfile;
  }

  const userWithRole = user as any;
  return {
    ...user,
    role: {
      name: userWithRole.role?.name || 'viewer',
      permissions: userWithRole.role?.permissions || []
    },

    permissions: userWithRole.role?.permissions?.map((p: any) => p.name) || [],
    forcePasswordChange: resolvePasswordChangeState(user) === 'required',
    passwordChangeState: resolvePasswordChangeState(user),
  };
}

/**
 * @description Altera la contraseña de forma proactiva exigiendo confirmación de la actual, limpiando la bandera "forcePasswordChange".
 * @param userId @param currentPassword @param newPassword
 */
export async function changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw createAppError('NOT_FOUND', 'Usuario no encontrado');
  }

  if (!user.forcePasswordChange) {
    const currentState = resolvePasswordChangeState(user);
    const requiresCurrentPassword = currentState !== 'required';
    if (requiresCurrentPassword) {
      if (!currentPassword) {
        throw createAppError('BAD_REQUEST', 'La contraseña actual es obligatoria');
      }
      const valid = await comparePassword(currentPassword, user.passwordHash);
      if (!valid) {
        throw createAppError('BAD_REQUEST', 'Contraseña actual incorrecta');
      }
    }
  }

  const newHash = await hashPassword(newPassword);
  await executeInTransaction(async (tx) => {
    await updateUserById(user.id, {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
      ...buildClearedPasswordChangeFields(),
    }, tx);
  });
}
