import { z } from 'zod';
import { USER_DEPARTMENTS, USER_STATUSES } from './users.constants';

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional().default(20),
  search: z.string().optional(),
  email: z.string().email().optional(),
  roleId: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(USER_STATUSES).optional(),

  department: z.enum(USER_DEPARTMENTS).optional(),
  employeeId: z.string().optional(),
  branchId: z.string().optional(),
  lastLoginFrom: z.string().optional(),
  lastLoginTo: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'email', 'role', 'status', 'lastLoginAt', 'department', 'branch']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});


export const createUserBodySchema = z.object({
  employeeId: z.string().optional().nullable(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().optional(),
  role: z.string().optional(),

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
  roleId: z.string().optional(),
  role: z.string().optional(),
});

export const resetPasswordBodySchema = z.object({
  newPassword: z.string().min(8),
});

export const userSchedulesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
