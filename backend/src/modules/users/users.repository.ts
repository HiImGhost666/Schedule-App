import { Prisma, User } from '@prisma/client';
import { prisma } from '../../config/database';
import { TransactionClient } from '../../common/transactions/transaction.utils';
import { USER_RESPONSE_SELECT, USER_SAFE_SELECT, type UserResponse } from './users.selects';

type UserWhere = NonNullable<Parameters<typeof prisma.user.findMany>[0]>['where'];
type UserCreateData = NonNullable<Parameters<typeof prisma.user.create>[0]>['data'];
type UserUpdateData = NonNullable<Parameters<typeof prisma.user.update>[0]>['data'];
type IdentityConflict = { id: string; email: string } | null;

function getDb(tx?: TransactionClient) {
  return tx ?? prisma;
}

export function findUserById(id: string, tx?: TransactionClient) {
  return getDb(tx).user.findUnique({ where: { id } });
}

export function findUserDetailById(id: string, tx?: TransactionClient) {
  return getDb(tx).user.findUnique({ where: { id }, select: USER_RESPONSE_SELECT });
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
    orderBy: { createdAt: 'asc' },
  });
}

export function findUserIdentityConflict(email: string, username: string, excludeUserId: string, tx?: TransactionClient): Promise<IdentityConflict> {
  return getDb(tx).user.findFirst({
    where: {
      id: { not: excludeUserId },
      NOT: { email: { startsWith: 'deleted_' } },
      OR: [{ email }, { email: { startsWith: `${username}@` } }],
    },
    select: { id: true, email: true },
  });
}

export function createUserRecord(data: UserCreateData, tx?: TransactionClient): Promise<UserResponse> {
  return getDb(tx).user.create({
    data,
    select: USER_SAFE_SELECT,
  });
}

export function updateUserRecord(id: string, data: UserUpdateData, tx?: TransactionClient): Promise<UserResponse> {
  return getDb(tx).user.update({
    where: { id },
    data,
    select: USER_RESPONSE_SELECT,
  });
}

export function listUsers(where: UserWhere, page: number, limit: number) {
  return Promise.all([
    prisma.user.findMany({
      where,
      select: USER_RESPONSE_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
}

export function listUserSchedules(userId: string, from?: Date, to?: Date) {
  const dateFilters =
    from && to
      ? {
          AND: [
            { startDatetime: { lte: to } },
            { endDatetime: { gte: from } },
          ],
        }
      : {
          ...(from ? { endDatetime: { gte: from } } : {}),
          ...(to ? { startDatetime: { lte: to } } : {}),
        };

  return prisma.schedule.findMany({
    where: {
      assignments: { some: { userId } },
      ...dateFilters,
    },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              department: true,
              companyPhone: true,
              auxiliaryPhone: true,
            },
          },
        },
      },
    },
    orderBy: { startDatetime: 'asc' },
  });
}

export function buildUsersWhere(search?: string, role?: string, status?: string, email?: string): UserWhere {
  const where: UserWhere = {
    NOT: { email: { startsWith: 'deleted_' } },
  };
  if (search) {
    where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
  }
  if (email) where.email = email;
  if (role) where.role = role;
  if (status) where.status = status;
  return where;
}

export type UserEntity = User;
