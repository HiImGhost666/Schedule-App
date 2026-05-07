import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import {
  createBranchController,
  createBranchHolidayController,
  bulkDeleteBranchHolidayController,
  bulkUpdateBranchHolidayController,
  deleteBranchController,
  deleteBranchHolidayController,
  hardDeleteBranchController,
  listBranchesController,
  listBranchHolidaysController,
  updateBranchController,
  updateBranchHolidayController,
  assignBranchManagerController,
  removeBranchManagerController,
} from './branches.controller';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => listBranchesController(req, res));
router.post('/', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => createBranchController(req, res));
router.patch('/:branchId', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => updateBranchController(req, res));
router.delete('/:branchId', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => deleteBranchController(req, res));
router.delete('/:branchId/permanent', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => hardDeleteBranchController(req, res));

router.get('/:branchId/holidays', authMiddleware, (req: AuthRequest, res: Response) => listBranchHolidaysController(req, res));
router.post('/:branchId/holidays', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => createBranchHolidayController(req, res));
router.patch('/:branchId/holidays/bulk', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => bulkUpdateBranchHolidayController(req, res));
router.delete('/:branchId/holidays/bulk', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => bulkDeleteBranchHolidayController(req, res));
router.patch('/:branchId/holidays/:holidayId', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => updateBranchHolidayController(req, res));
router.delete('/:branchId/holidays/:holidayId', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => deleteBranchHolidayController(req, res));

// Manager assignment/removal - Single Transaction Pattern
router.patch('/:branchId/manager', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => assignBranchManagerController(req, res));
router.delete('/:branchId/manager', authMiddleware, requirePermission('branches:manage'), (req: AuthRequest, res: Response) => removeBranchManagerController(req, res));

export default router;
