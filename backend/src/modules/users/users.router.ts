import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  changeUserRoleController,
  changeUserStatusController,
  createUserController,
  deleteUserController,
  getUserController,
  listUserSchedulesController,
  listUsersController,
  resetPasswordController,
  updateUserController,
} from './users.controller';

const router = Router();

// List users
router.get('/', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => listUsersController(req, res));

// Get single user
router.get('/:id', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => getUserController(req, res));

// Create user
router.post('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => createUserController(req, res));

// Update user
router.patch('/:id', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => updateUserController(req, res));

// Change status
router.patch('/:id/status', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => changeUserStatusController(req, res));

// Change role
router.patch('/:id/role', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => changeUserRoleController(req, res));

// Reset password
router.post('/:id/reset-password', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => resetPasswordController(req, res));

// Soft delete user
router.delete('/:id', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => deleteUserController(req, res));

// Get user schedules
router.get('/:id/schedules', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => listUserSchedulesController(req, res));

export default router;
