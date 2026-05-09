import { z } from 'zod';

export const createShiftPresetSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  isActive: z.boolean().optional().default(true),
});

export const updateShiftPresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido').optional(),
  isActive: z.boolean().optional(),
});

export type CreateShiftPresetInput = z.infer<typeof createShiftPresetSchema>;
export type UpdateShiftPresetInput = z.infer<typeof updateShiftPresetSchema>;
