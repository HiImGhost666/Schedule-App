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

export const planningRangeQuerySchema = z
  .object({
    from: dateQuerySchema,
    to: dateQuerySchema,
    branchId: planningIdSchema,
    departmentId: planningIdSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
    path: ['from'],
  });

export type PlanningRangeQueryInput = z.infer<typeof planningRangeQuerySchema>;
