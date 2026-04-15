import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendPaginated, sendError, sendSuccess } from '../../utils/response';
import { getAuditLogById, listAuditLogs, rollbackAudit } from './audit.service';
import { auditIdParamsSchema, listAuditQuerySchema } from './audit.http.schemas';
import { isAppError } from '../../common/errors/app-error';

export async function listAuditLogsController(req: AuthRequest, res: Response) {
  const parsed = listAuditQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  const { logs, total } = await listAuditLogs({
    ...parsed.data,
    from: parsed.data.from ? new Date(parsed.data.from) : undefined,
    to: parsed.data.to ? new Date(parsed.data.to) : undefined,
  });

  return sendPaginated(res, logs, total, parsed.data.page, parsed.data.limit);
}

export async function getAuditLogController(req: AuthRequest, res: Response) {
  const parsed = auditIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 'Identificador de auditoría inválido', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const log = await getAuditLogById(parsed.data.id);
    return sendSuccess(res, log);
  } catch (error) {
    if (isAppError(error)) {
      return sendError(res, error.message, error.statusCode, error.details, error.code);
    }
    throw error;
  }
}

export async function rollbackAuditController(req: AuthRequest, res: Response) {
  const parsed = auditIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 'Identificador de auditoría inválido', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const result = await rollbackAudit(parsed.data.id, req.user!.id, req.ip);
    return sendSuccess(res, result, 'Rollback realizado con éxito');
  } catch (error) {
    if (isAppError(error)) {
      return sendError(res, error.message, error.statusCode, error.details, error.code);
    }
    throw error;
  }
}
