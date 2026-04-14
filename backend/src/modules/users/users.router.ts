import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { sendError } from '../../utils/response';
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

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
  department: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  islandCalendar: z.enum(['tenerife', 'las_palmas', 'none']).default('none'),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
  avatarUrl: z.string().optional(),
  islandCalendar: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
});

// List users
router.get('/', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => listUsersController(req, res));

// Get single user
router.get('/:id', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => getUserController(req, res));

// Create user
router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten());
  return createUserController(req, res);
});

// Update user
router.patch('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  return updateUserController(req, res);
});

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
