import { prisma } from '../../config/database';
import { TransactionClient } from '../../common/transactions/transaction.utils';
import { Prisma } from '@prisma/client';
import { AuditParams } from './domain/audit.types';

type AuditLogWhere = Prisma.Args<typeof prisma.auditLog, 'findMany'>['where'];

function getDb(tx?: TransactionClient) {
  return tx ?? prisma;
}

export async function createAuditLog(data: any, tx?: TransactionClient) {
  return getDb(tx).auditLog.create({ data });
}

export async function findAuditLogs(
  where: AuditLogWhere,
  page: number,
  limit: number
) {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function findAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}
