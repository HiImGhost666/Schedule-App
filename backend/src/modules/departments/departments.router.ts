import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import {
  assignDepartmentManagerController,
  createDepartmentController,
  deleteDepartmentController,
  hardDeleteDepartmentController,
  listDepartmentsController,
  listDepartmentBranchesController,
  removeDepartmentManagerController,
  updateDepartmentController,
} from './departments.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => listDepartmentsController(req, res));
router.get('/:departmentId/branches', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => listDepartmentBranchesController(req, res));
router.post('/', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => createDepartmentController(req, res));
router.patch('/:departmentId', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => updateDepartmentController(req, res));
router.delete('/:departmentId', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => deleteDepartmentController(req, res));
router.delete('/:departmentId/permanent', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => hardDeleteDepartmentController(req, res));
router.patch('/:departmentId/manager', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => assignDepartmentManagerController(req, res));
router.delete('/:departmentId/manager', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => removeDepartmentManagerController(req, res));

export default router;
