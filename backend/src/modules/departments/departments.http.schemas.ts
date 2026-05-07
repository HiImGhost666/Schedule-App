import { z } from 'zod';

const departmentCodeRegex = /^[A-Z0-9_-]{2,20}$/;

export const departmentIdParamsSchema = z.object({
  departmentId: z.string().min(1),
});

export const listDepartmentsQuerySchema = z.object({
  branchId: z.string().min(1).optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});

export const createDepartmentBodySchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().trim().toUpperCase().regex(departmentCodeRegex, 'Código inválido (2-20, A-Z, 0-9, _ o -)'),
  description: z.string().max(200).optional(),
  branchIds: z.array(z.string().min(1)).min(1, 'Debe seleccionar al menos una sucursal'),
});

export const updateDepartmentBodySchema = createDepartmentBodySchema.partial().extend({
  isActive: z.boolean().optional(),
  branchIds: z.array(z.string().min(1)).min(1).optional(),
});

export const assignDepartmentManagerBodySchema = z.object({
  userId: z.string().min(1, 'El ID del usuario es requerido'),
});
