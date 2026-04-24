import { z } from 'zod';
import { USER_DEPARTMENTS, USER_ROLES, USER_STATUSES } from './users.constants';

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const usersSortBySchema = z.enum(['createdAt', 'name', 'email', 'role', 'status', 'lastLoginAt']);
export const sortOrderSchema = z.enum(['asc', 'desc']);

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  sortBy: usersSortBySchema.optional().default('createdAt'),
  sortOrder: sortOrderSchema.optional().default('desc'),
});

export const createUserBodySchema = z.object({
  employeeId: z.string().optional().nullable(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  department: z.enum(USER_DEPARTMENTS).optional(),
  avatarUrl: z.string().url().optional(),
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
  branchId: z.string().min(1),
});

export const createUserCsvBodySchema = createUserBodySchema.extend({
  password: z.string().min(8).optional(),
});

export const updateUserBodySchema = createUserBodySchema
  .omit({ password: true })
  .partial();

export const changeStatusBodySchema = z.object({
  status: z.enum(USER_STATUSES),
});

export const changeRoleBodySchema = z.object({
  role: z.enum(USER_ROLES),
});

export const resetPasswordBodySchema = z.object({
  newPassword: z.string().min(8),
});

export const userSchedulesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
