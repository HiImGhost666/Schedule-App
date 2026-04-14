import { prisma } from '../../config/database';
import { TransactionClient } from '../../common/transactions/transaction.utils';

export interface AuditParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  detailsJson?: object;
  ipAddress?: string;
  userAgent?: string;
}

function buildAuditCreateData(params: AuditParams) {
  return {
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    detailsJson: params.detailsJson ? JSON.stringify(params.detailsJson) : undefined,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };
}

export async function logAuditOrThrow(params: AuditParams, tx: TransactionClient) {
  await tx.auditLog.create({
    data: buildAuditCreateData(params),
  });
}

export async function logAudit(params: AuditParams, tx?: TransactionClient) {
  if (tx) {
    await logAuditOrThrow(params, tx);
    return;
  }

  try {
    await prisma.auditLog.create({
      data: buildAuditCreateData(params),
    });
  } catch {
    // Audit failures must not break the main flow outside atomic transactions
  }
}

export async function getAuditLogs(params: {
  page: number;
  limit: number;
  userId?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
}) {
  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = { contains: params.action };
  if (params.entityType) where.entityType = params.entityType;
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from && { gte: params.from }),
      ...(params.to && { lte: params.to }),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
