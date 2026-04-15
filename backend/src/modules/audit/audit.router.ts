import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { getAuditLogs } from './audit.service';
import { sendPaginated, sendError, sendSuccess } from '../../utils/response';
import { z } from 'zod';

const router = Router();
const auditIdSchema = z.object({
  id: z.string().min(1),
});

function parseDetails(detailsJson: unknown) {
  if (typeof detailsJson !== 'string') return detailsJson;
  try {
    return JSON.parse(detailsJson);
  } catch {
    return detailsJson;
  }
}

router.get('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const { userId, action, entityType, from, to } = req.query;

  const { logs, total } = await getAuditLogs({
    page,
    limit,
    userId: userId as string,
    action: action as string,
    entityType: entityType as string,
    from: from ? new Date(from as string) : undefined,
    to: to ? new Date(to as string) : undefined,
  });

  return sendPaginated(res, logs, total, page, limit);
});

router.get('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = auditIdSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, 'Identificador de auditoría inválido', 400, parsed.error.flatten(), 'BAD_REQUEST');

  const { prisma } = await import('../../config/database');
  const log = await prisma.auditLog.findUnique({
    where: { id: parsed.data.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!log) return sendError(res, 'Registro no encontrado', 404);
  return sendSuccess(res, {
    ...log,
    detailsJson: parseDetails(log.detailsJson),
  });
});

export default router;
