import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  createScheduleController,
  deleteScheduleController,
  getScheduleController,
  listSchedulesController,
  listWeekSchedulesController,
  updateScheduleController,
} from './schedules.controller';

const router = Router();

// Get schedules in date range
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => listSchedulesController(req, res));

// Get weekly schedules
router.get('/week/:year/:week', authMiddleware, (req: AuthRequest, res: Response) => listWeekSchedulesController(req, res));

// Get single schedule
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => getScheduleController(req, res));

// Create schedule
router.post('/', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => createScheduleController(req, res));

// Update schedule
router.patch('/:id', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => updateScheduleController(req, res));

// Delete schedule
router.delete('/:id', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => deleteScheduleController(req, res));

export default router;
