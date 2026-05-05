import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  createDepartmentController,
  deleteDepartmentController,
  hardDeleteDepartmentController,
  listDepartmentsController,
  updateDepartmentController,
} from './departments.controller';

const router = Router();

router.get('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => listDepartmentsController(req, res));
router.post('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => createDepartmentController(req, res));
router.patch('/:departmentId', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => updateDepartmentController(req, res));
router.delete('/:departmentId', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => deleteDepartmentController(req, res));
router.delete('/:departmentId/permanent', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => hardDeleteDepartmentController(req, res));

export default router;
