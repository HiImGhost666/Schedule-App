import { z } from 'zod';

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  // 'true' = solo acciones revertibles, 'false' = solo acciones irreversibles (seguridad/sesión)
  reversible: z.enum(['true', 'false']).optional(),
});

export const auditIdParamsSchema = z.object({
  id: z.string().min(1),
});
