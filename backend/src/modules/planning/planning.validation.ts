import { z } from 'zod';

const dateQuerySchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())
  .transform((value) => new Date(value));

export const planningRangeQuerySchema = z
  .object({
    from: dateQuerySchema,
    to: dateQuerySchema,
    branchId: z.string().min(1).optional(),
    departmentId: z.string().min(1).optional(),
  })
  .refine((value) => value.from <= value.to, {
    message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
    path: ['from'],
  });

export type PlanningRangeQueryInput = z.infer<typeof planningRangeQuerySchema>;
