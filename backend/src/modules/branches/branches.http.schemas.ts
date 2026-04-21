import { z } from 'zod';
import { HOLIDAY_TYPES, HOLIDAY_SCOPES } from './branches.constants';

const branchCodeRegex = /^[A-Z0-9_-]{2,20}$/;

export const branchIdParamsSchema = z.object({
  branchId: z.string().min(1),
});

export const holidayIdParamsSchema = z.object({
  branchId: z.string().min(1),
  holidayId: z.string().min(1),
});

export const listBranchesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});

export const createBranchBodySchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().trim().toUpperCase().regex(branchCodeRegex, 'Código inválido (2-20, A-Z, 0-9, _ o -)'),
  address: z.string().max(160).optional(),
  city: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  countryCode: z.string().trim().toUpperCase().length(2).optional(),
  timezone: z.string().min(3).max(50).optional(),
});

export const updateBranchBodySchema = createBranchBodySchema.partial();

export const listBranchHolidaysQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});

const holidayTypeSchema = z.enum(HOLIDAY_TYPES);
const holidayScopeSchema = z.enum(HOLIDAY_SCOPES);

export const createBranchHolidayBodySchema = z.object({
  date: z.coerce.date(),
  originalDate: z.coerce.date().optional().nullable(),
  name: z.string().min(2).max(120),
  type: holidayTypeSchema,
  scope: holidayScopeSchema.optional(),
  isPartial: z.boolean().optional().default(false),
});

export const updateBranchHolidayBodySchema = createBranchHolidayBodySchema.partial();
