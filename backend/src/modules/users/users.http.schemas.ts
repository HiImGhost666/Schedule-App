import { z } from 'zod';

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
});

export const createUserBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
  department: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  islandCalendar: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
});

export const updateUserBodySchema = createUserBodySchema
  .omit({ password: true })
  .partial();

export const changeStatusBodySchema = z.object({
  status: z.enum(['active', 'disabled', 'locked']),
});

export const changeRoleBodySchema = z.object({
  role: z.enum(['admin', 'manager', 'viewer']),
});

export const resetPasswordBodySchema = z.object({
  newPassword: z.string().min(8),
});

export const userSchedulesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
