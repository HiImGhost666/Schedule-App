import { Prisma } from '@prisma/client';

export const USER_RESPONSE_SELECT: Prisma.UserSelect = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  derivedUsername: true,
  passwordChangedAt: true,
  tokenVersion: true,
  roleId: true,
  role: {
    select: {
      name: true,
      permissions: {
        select: {
          name: true,
        },
      },
    },
  },
  status: true,
  avatarUrl: true,
  createdAt: true,
  lastLoginAt: true,
  failedAttempts: true,
  forcePasswordChange: true,
  passwordChangePolicy: true,
  passwordChangeWarnedAt: true,
  passwordChangeDeadlineAt: true,
  companyPhone: true,
  auxiliaryPhone: true,
  branchId: true,
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} as const;

export const USER_SAFE_SELECT: Prisma.UserSelect = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  derivedUsername: true,
  passwordChangedAt: true,
  tokenVersion: true,
  roleId: true,
  role: {
    select: {
      name: true,
      permissions: {
        select: {
          name: true,
        },
      },
    },
  },
  status: true,
  avatarUrl: true,
  createdAt: true,
  lastLoginAt: true,
  failedAttempts: true,
  forcePasswordChange: true,
  passwordChangePolicy: true,
  passwordChangeWarnedAt: true,
  passwordChangeDeadlineAt: true,
  companyPhone: true,
  auxiliaryPhone: true,
  branchId: true,
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} as const;

export type UserResponse = Prisma.UserGetPayload<{ select: typeof USER_RESPONSE_SELECT }>;
