import { z } from 'zod';

// Validar que una fecha sea día laborable (lunes a viernes)
const isWeekday = (date: Date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

export const createVacationRequestSchema = z
  .object({
    startDate: z.coerce.date().refine((date) => isWeekday(date), {
      message: 'La fecha de inicio debe ser un día laborable (lunes a viernes)',
    }),
    endDate: z.coerce.date().refine((date) => isWeekday(date), {
      message: 'La fecha de fin debe ser un día laborable (lunes a viernes)',
    }),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      return data.endDate >= data.startDate;
    },
    {
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      path: ['endDate'],
    }
  );

export const approveVacationSchema = z.object({
  note: z.string().max(500).optional(),
});

export const rejectVacationSchema = z.object({
  rejectionReason: z.string().min(1, 'El motivo de rechazo es obligatorio').max(500),
});

export const vacationIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listVacationsQuerySchema = z.object({
  status: z.string().optional(),
  employeeId: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const vacationCalendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  week: z.coerce.number().int().min(1).max(53),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
});

export type CreateVacationRequestInput = z.infer<typeof createVacationRequestSchema>;
export type ApproveVacationInput = z.infer<typeof approveVacationSchema>;
export type RejectVacationInput = z.infer<typeof rejectVacationSchema>;
export type ListVacationsQuery = z.infer<typeof listVacationsQuerySchema>;
export type VacationCalendarQuery = z.infer<typeof vacationCalendarQuerySchema>;
