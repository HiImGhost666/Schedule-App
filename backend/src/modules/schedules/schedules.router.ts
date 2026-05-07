import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import {
  createScheduleBulkController,
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
router.post('/', authMiddleware, requirePermission('schedules:create'), (req: AuthRequest, res: Response) => createScheduleController(req, res));

// Bulk create schedules
router.post('/bulk', authMiddleware, requirePermission('schedules:manage'), (req: AuthRequest, res: Response) => createScheduleBulkController(req, res));

// Update schedule
router.patch('/:id', authMiddleware, requirePermission('schedules:update'), (req: AuthRequest, res: Response) => updateScheduleController(req, res));

// Delete schedule
router.delete('/:id', authMiddleware, requirePermission('schedules:delete'), (req: AuthRequest, res: Response) => deleteScheduleController(req, res));

export default router;
