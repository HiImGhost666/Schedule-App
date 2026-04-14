import { prisma } from '../../config/database';
import { comparePassword } from '../../utils/bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES, USER_STATUS } from '../../config/constants';
import { addMinutes, isAfter } from 'date-fns';
import crypto from 'crypto';
import { findUserByEmailOrUsername } from '../users/users.service';

export async function login(identifier: string, password: string, ipAddress?: string, userAgent?: string) {
  const user = await findUserByEmailOrUsername(identifier);

  if (!user) {
    throw new Error('Credenciales incorrectas');
  }

  if (user.status === USER_STATUS.DISABLED) {
    throw new Error('Cuenta deshabilitada. Contacta con el administrador');
  }

  if (user.status === USER_STATUS.LOCKED && user.lockedUntil) {
    if (isAfter(new Date(), user.lockedUntil)) {
      // Unlock expired lockout
      await prisma.user.update({
        where: { id: user.id },
        data: { status: USER_STATUS.ACTIVE, failedAttempts: 0, lockedUntil: null },
      });
    } else {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new Error(`Cuenta bloqueada. Inténtalo de nuevo en ${minutesLeft} minuto(s)`);
    }
  }

  const passwordValid = await comparePassword(password, user.passwordHash);

  if (!passwordValid) {
    const newAttempts = user.failedAttempts + 1;
    const updates: Record<string, unknown> = { failedAttempts: newAttempts };

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      updates.status = USER_STATUS.LOCKED;
      updates.lockedUntil = addMinutes(new Date(), LOCKOUT_MINUTES);
    }

    await prisma.user.update({ where: { id: user.id }, data: updates });
    throw new Error('Credenciales incorrectas');
  }

  // Reset failed attempts on success
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lastLoginAt: new Date() },
  });

  const tokenId = crypto.randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  const refreshToken = signRefreshToken({ sub: user.id, jti: tokenId });

  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiry,
      ipAddress,
      userAgent,
    },
  });

  const { passwordHash: _, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
}

export async function refreshTokens(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new Error('Refresh token inválido o expirado');
  }

  const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
  if (!storedToken || storedToken.revokedAt || isAfter(new Date(), storedToken.expiresAt)) {
    throw new Error('Refresh token inválido o expirado');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw new Error('Usuario no disponible');
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const newTokenId = crypto.randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  const newRefreshToken = signRefreshToken({ sub: user.id, jti: newTokenId });

  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      id: newTokenId,
      token: newRefreshToken,
      userId: user.id,
      expiresAt: refreshExpiry,
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revokedAt: new Date() },
  });
}
