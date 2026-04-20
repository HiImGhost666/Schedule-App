import { Prisma } from '@prisma/client';

export const USER_RESPONSE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  department: true,
  createdAt: true,
  lastLoginAt: true,
  failedAttempts: true,
  forcePasswordChange: true,
  islandCalendar: true,
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
} as const;

export const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  department: true,
  createdAt: true,
  lastLoginAt: true,
  failedAttempts: true,
  forcePasswordChange: true,
  islandCalendar: true,
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
} as const;

export type UserResponse = Prisma.UserGetPayload<{ select: typeof USER_RESPONSE_SELECT }>;
