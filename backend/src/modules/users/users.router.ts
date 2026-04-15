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
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
  avatarUrl: z.string().optional(),
  islandCalendar: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
  companyPhone: z.string().optional(),
  auxiliaryPhone: z.string().optional(),
});

// List users
router.get('/', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => listUsersController(req, res));

// Get single user
router.get('/:id', authMiddleware, requireRole('admin', 'manager'), (req: AuthRequest, res: Response) => getUserController(req, res));
  //revisar------
router.get('/', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const { search, role, status } = req.query;

  const where: Record<string, unknown> = {
    NOT: { email: { startsWith: 'deleted_' } }, // exclude soft-deleted users
  };
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { email: { contains: search as string } },
    ];
  }
  if (role) where.role = role;
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, status: true,
        avatarUrl: true, department: true, createdAt: true, lastLoginAt: true,
        failedAttempts: true, forcePasswordChange: true, islandCalendar: true,
        companyPhone: true, auxiliaryPhone: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return sendPaginated(res, users, total, page, limit);
});

// Get single user
router.get('/:id', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, email: true, role: true, status: true,
      avatarUrl: true, department: true, createdAt: true, lastLoginAt: true,
      failedAttempts: true, forcePasswordChange: true,
      companyPhone: true, auxiliaryPhone: true,
    },
  });
  if (!user) return sendError(res, 'Usuario no encontrado', 404);
  return sendSuccess(res, user);
});

// Create user
router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten());
  return createUserController(req, res);
 //revisar-----
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return sendError(res, 'El email ya está registrado', 409);

  const passwordHash = await hashPassword(parsed.data.password);
  const { password: _pw, ...userData } = parsed.data;
  const user = await prisma.user.create({
    data: { ...userData, passwordHash },
    select: {
      id: true, name: true, email: true, role: true, status: true,
      department: true, createdAt: true, islandCalendar: true,
      companyPhone: true, auxiliaryPhone: true
    },
  });

  await logAudit({ userId: req.user!.id, action: 'CREATE_USER', entityType: 'User', entityId: user.id, detailsJson: { email: user.email, role: user.role }, ipAddress: req.ip });
  return sendSuccess(res, user, 'Usuario creado', 201);
});

// Update user
router.patch('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  return updateUserController(req, res);
  //revisar-----
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400);

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return sendError(res, 'Usuario no encontrado', 404);

  if (parsed.data.email && parsed.data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return sendError(res, 'El email ya está en uso', 409);
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: {
      id: true, name: true, email: true, role: true, status: true,
      department: true, islandCalendar: true,
      companyPhone: true, auxiliaryPhone: true
    },
  });

  await logAudit({ userId: req.user!.id, action: 'UPDATE_USER', entityType: 'User', entityId: req.params.id, detailsJson: parsed.data, ipAddress: req.ip });
  return sendSuccess(res, updated, 'Usuario actualizado');
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
