import { z } from 'zod';

const planningIdSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).max(100).optional(),
);

const dateQuerySchema = z
  .string({ error: 'Fecha requerida' })
  .trim()
  .min(1, 'Fecha requerida')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Fecha invalida')
  .transform((value) => new Date(value));

const planningRangeQueryBaseSchema = z.object({
  from: dateQuerySchema,
  to: dateQuerySchema,
  branchId: planningIdSchema,
  departmentId: planningIdSchema,
});

export const planningRangeQuerySchema = planningRangeQueryBaseSchema
  .refine((value) => value.from <= value.to, {
    message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
    path: ['from'],
  });

const commaSeparatedIdsSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return [];
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  },
  z.array(z.string().min(1)).default([]),
);

export const planningSubstitutesQuerySchema = planningRangeQueryBaseSchema.extend({
  scheduleId: planningIdSchema,
  skillIds: commaSeparatedIdsSchema,
}).refine((value) => value.from <= value.to, {
  message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
  path: ['from'],
});

export const planningTemplatePreviewQuerySchema = planningRangeQueryBaseSchema.extend({
  scheduleId: planningIdSchema,
  skillIds: commaSeparatedIdsSchema,
  minCoverage: z.coerce.number().int().min(1).max(10).optional().default(1),
}).refine((value) => value.from <= value.to, {
  message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
  path: ['from'],
});

export const supportRequestBodySchema = z
  .object({
    targetUserId: z.string().trim().min(1),
    branchId: z.string().trim().min(1),
    departmentId: z.string().trim().min(1).nullable().optional(),
    startDate: dateQuerySchema,
    endDate: dateQuerySchema,
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
    path: ['startDate'],
  });

export const supportRequestParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const supportRequestReviewBodySchema = z.object({
  status: z.enum(['accepted', 'rejected', 'cancelled']),
});

export const notificationPreferencesBodySchema = z.object({
  scheduleChanges: z.boolean().optional(),
  vacationUpdates: z.boolean().optional(),
  departmentVacationRequests: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  criticalAlertsOnly: z.boolean().optional(),
});

export type PlanningRangeQueryInput = z.infer<typeof planningRangeQuerySchema>;
export type PlanningSubstitutesQueryInput = z.infer<typeof planningSubstitutesQuerySchema>;
export type PlanningTemplatePreviewQueryInput = z.infer<typeof planningTemplatePreviewQuerySchema>;
export type SupportRequestInput = z.infer<typeof supportRequestBodySchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesBodySchema>;
