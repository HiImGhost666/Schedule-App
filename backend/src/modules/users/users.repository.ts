import { User } from '@prisma/client';
import { prisma } from '../../config/database';
import { TransactionClient } from '../../common/transactions/transaction.utils';

const USER_DETAIL_SELECT = {
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
} as const;

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  department: true,
  avatarUrl: true,
  createdAt: true,
  islandCalendar: true,
} as const;

type UserWhere = NonNullable<Parameters<typeof prisma.user.findMany>[0]>['where'];
type UserCreateData = NonNullable<Parameters<typeof prisma.user.create>[0]>['data'];
type UserUpdateData = NonNullable<Parameters<typeof prisma.user.update>[0]>['data'];

function getDb(tx?: TransactionClient) {
  return tx ?? prisma;
}

export function findUserById(id: string, tx?: TransactionClient) {
  return getDb(tx).user.findUnique({ where: { id } });
}

export function findUserDetailById(id: string, tx?: TransactionClient) {
  return getDb(tx).user.findUnique({ where: { id }, select: USER_DETAIL_SELECT });
}

export function findUserByEmail(email: string, tx?: TransactionClient) {
  return getDb(tx).user.findUnique({ where: { email } });
}

export function findUserByNormalizedEmailOrDerivedUsername(email: string, username: string, tx?: TransactionClient) {
  return getDb(tx).user.findFirst({
    where: {
      NOT: { email: { startsWith: 'deleted_' } },
      OR: [{ email }, { email: { startsWith: `${username}@` } }],
    },
    select: { email: true },
  });
}

export function findUserByDerivedUsername(username: string, tx?: TransactionClient) {
  return getDb(tx).user.findFirst({
    where: {
      email: { startsWith: `${username}@` },
      NOT: { email: { startsWith: 'deleted_' } },
    },
  });
}

export function createUserRecord(data: UserCreateData, tx?: TransactionClient) {
  return getDb(tx).user.create({
    data,
    select: USER_SAFE_SELECT,
  });
}

export function updateUserRecord(id: string, data: UserUpdateData, tx?: TransactionClient) {
  return getDb(tx).user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      department: true,
      islandCalendar: true,
    },
  });
}

export function listUsers(where: UserWhere, page: number, limit: number) {
  return Promise.all([
    prisma.user.findMany({
      where,
      select: USER_DETAIL_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
}

export function listUserSchedules(userId: string, from?: string, to?: string) {
  return prisma.schedule.findMany({
    where: {
      assignments: { some: { userId } },
      ...(from && { startDatetime: { gte: new Date(from) } }),
      ...(to && { endDatetime: { lte: new Date(to) } }),
    },
    include: { assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
    orderBy: { startDatetime: 'asc' },
  });
}

export function buildUsersWhere(search?: string, role?: string, status?: string): UserWhere {
  const where: UserWhere = {
    NOT: { email: { startsWith: 'deleted_' } },
  };
  if (search) {
    where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
  }
  if (role) where.role = role;
  if (status) where.status = status;
  return where;
}

export type UserEntity = User;
