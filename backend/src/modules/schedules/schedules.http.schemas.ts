import { z } from 'zod';

export const scheduleIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const weekParamsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  week: z.coerce.number().int().min(1).max(53),
});

export const listSchedulesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().optional(),
  type: z.string().optional(),
  branchId: z.string().optional(),
});

export const listWeekSchedulesQuerySchema = z.object({
  branchId: z.string().optional(),
});

export const createScheduleBodySchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startDatetime: z.coerce.date(),
  endDatetime: z.coerce.date(),
  scheduleTypeId: z.string().min(1, 'El tipo de turno es obligatorio'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (must be #RRGGBB)').optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  branchId: z.string().min(1, 'La sucursal es obligatoria'),
  assigneeIds: z.array(z.string()).min(1, 'Al menos una persona debe estar asignada'),
  reason: z.string().optional(),
  hoursPerDay: z.number().min(0.5).max(24).optional().default(8),
  confirmed: z.boolean().optional().default(false),
});


export const updateScheduleBodySchema = createScheduleBodySchema.partial().extend({
  reason: z.string().optional(),
});

export const deleteScheduleBodySchema = z.object({
  reason: z.string().optional(),
});
