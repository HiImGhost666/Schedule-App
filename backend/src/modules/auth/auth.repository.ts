import { prisma } from '../../config/database';

export function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export function findUserProfileById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      department: true,
      createdAt: true,
      lastLoginAt: true,
      forcePasswordChange: true,
    },
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
    forcePasswordChange?: boolean;
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
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
