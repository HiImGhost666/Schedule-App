import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  createBranchController,
  createBranchHolidayController,
  deleteBranchController,
  deleteBranchHolidayController,
  listBranchesController,
  listBranchHolidaysController,
  updateBranchController,
  updateBranchHolidayController,
} from './branches.controller';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => listBranchesController(req, res));
router.post('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => createBranchController(req, res));
router.patch('/:branchId', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => updateBranchController(req, res));
router.delete('/:branchId', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => deleteBranchController(req, res));

router.get('/:branchId/holidays', authMiddleware, (req: AuthRequest, res: Response) => listBranchHolidaysController(req, res));
router.post('/:branchId/holidays', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => createBranchHolidayController(req, res));
router.patch('/:branchId/holidays/:holidayId', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => updateBranchHolidayController(req, res));
router.delete('/:branchId/holidays/:holidayId', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => deleteBranchHolidayController(req, res));

export default router;
