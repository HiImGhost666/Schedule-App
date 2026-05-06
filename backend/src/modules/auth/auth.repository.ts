import { prisma } from '../../config/database';
import { USER_RESPONSE_SELECT } from '../users/users.selects';

const AUTH_USER_SELECT = {
  ...USER_RESPONSE_SELECT,
  passwordHash: true,
} as const;

export function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: AUTH_USER_SELECT,
  });
}

export function findUserProfileById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: USER_RESPONSE_SELECT,
  });
}

export function updateUserById(
  userId: string,
  data: {
    status?: string;
    failedAttempts?: number;
    lockedUntil?: Date | null;
    lastLoginAt?: Date;
    passwordHash?: string;
    passwordChangedAt?: Date;
    forcePasswordChange?: boolean;
    passwordChangePolicy?: string;
    passwordChangeWarnedAt?: Date | null;
    passwordChangeDeadlineAt?: Date | null;
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: USER_RESPONSE_SELECT,
  });
}

export function createRefreshToken(data: {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.refreshToken.create({ data });
}

export function findRefreshTokenByToken(token: string) {
  return prisma.refreshToken.findUnique({ where: { token } });
}

export function revokeRefreshTokenById(id: string) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export function revokeRefreshTokensByToken(token: string) {
  return prisma.refreshToken.updateMany({
    where: { token },
    data: { revokedAt: new Date() },
  });
}
