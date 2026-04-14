import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { sendError } from '../../utils/response';
import {
  createScheduleController,
  deleteScheduleController,
  getScheduleController,
  listSchedulesController,
  listWeekSchedulesController,
  updateScheduleController,
} from './schedules.controller';

const router = Router();

const scheduleSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startDatetime: z.coerce.date(),
  endDatetime: z.coerce.date(),
  type: z.string().default('guardia'),
  color: z.string().default('#1e3a5f'),
  location: z.string().optional(),
  notes: z.string().optional(),
  assigneeIds: z.array(z.string()).min(1, 'Al menos una persona debe estar asignada'),
  reason: z.string().optional(),
  hoursPerDay: z.number().min(0.5).max(24).optional().default(8),
  calendarType: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
});

// Get schedules in date range
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => listSchedulesController(req, res));

// Get weekly schedules
router.get('/week/:year/:week', authMiddleware, (req: AuthRequest, res: Response) => listWeekSchedulesController(req, res));

// Get single schedule
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => getScheduleController(req, res));

// Create schedule
router.post('/', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten());
  req.body = parsed.data;
  return createScheduleController(req, res);
});

// Update schedule
router.patch('/:id', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  const updateSchema = scheduleSchema.partial().extend({ reason: z.string().optional() });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  req.body = parsed.data;
  return updateScheduleController(req, res);
});

// Delete schedule
router.delete('/:id', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => deleteScheduleController(req, res));

export default router;
