import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/bcrypt';
import { logAudit } from '../audit/audit.service';
import { addMinutes } from 'date-fns';

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
    },
  });
  if (!user) return sendError(res, 'Usuario no encontrado', 404);
  return sendSuccess(res, user);
});

// Create user
router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400, parsed.error.flatten());

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return sendError(res, 'El email ya está registrado', 409);

  const passwordHash = await hashPassword(parsed.data.password);
  const { password: _pw, ...userData } = parsed.data;
  const user = await prisma.user.create({
    data: { ...userData, passwordHash },
    select: { id: true, name: true, email: true, role: true, status: true, department: true, createdAt: true, islandCalendar: true },
  });

  await logAudit({ userId: req.user!.id, action: 'CREATE_USER', entityType: 'User', entityId: user.id, detailsJson: { email: user.email, role: user.role }, ipAddress: req.ip });
  return sendSuccess(res, user, 'Usuario creado', 201);
});

// Update user
router.patch('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
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
    select: { id: true, name: true, email: true, role: true, status: true, department: true, islandCalendar: true },
  });

  await logAudit({ userId: req.user!.id, action: 'UPDATE_USER', entityType: 'User', entityId: req.params.id, detailsJson: parsed.data, ipAddress: req.ip });
  return sendSuccess(res, updated, 'Usuario actualizado');
});

// Change status
router.patch('/:id/status', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!['active', 'disabled', 'locked'].includes(status)) return sendError(res, 'Estado inválido', 400);

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return sendError(res, 'Usuario no encontrado', 404);
  if (req.params.id === req.user!.id) return sendError(res, 'No puedes cambiar tu propio estado', 400);

  const updateData: Record<string, unknown> = { status };
  if (status === 'active') {
    updateData.failedAttempts = 0;
    updateData.lockedUntil = null;
  }
  if (status === 'locked') {
    updateData.lockedUntil = addMinutes(new Date(), 99999);
  }

  await prisma.user.update({ where: { id: req.params.id }, data: updateData });
  await logAudit({ userId: req.user!.id, action: `USER_STATUS_CHANGE`, entityType: 'User', entityId: req.params.id, detailsJson: { newStatus: status }, ipAddress: req.ip });
  return sendSuccess(res, null, `Estado actualizado a ${status}`);
});

// Change role
router.patch('/:id/role', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { role } = req.body;
  if (!['admin', 'manager', 'viewer'].includes(role)) return sendError(res, 'Rol inválido', 400);
  if (req.params.id === req.user!.id) return sendError(res, 'No puedes cambiar tu propio rol', 400);

  await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  await logAudit({ userId: req.user!.id, action: 'USER_ROLE_CHANGE', entityType: 'User', entityId: req.params.id, detailsJson: { newRole: role }, ipAddress: req.ip });
  return sendSuccess(res, null, 'Rol actualizado');
});

// Reset password
router.post('/:id/reset-password', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return sendError(res, 'La contraseña debe tener al menos 8 caracteres', 400);

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return sendError(res, 'Usuario no encontrado', 404);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash, forcePasswordChange: true, failedAttempts: 0, lockedUntil: null, status: 'active' },
  });

  await logAudit({ userId: req.user!.id, action: 'RESET_PASSWORD', entityType: 'User', entityId: req.params.id, ipAddress: req.ip });
  return sendSuccess(res, null, 'Contraseña restablecida. El usuario deberá cambiarla en el próximo inicio de sesión');
});

// Soft delete user
router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return sendError(res, 'Usuario no encontrado', 404);
  if (req.params.id === req.user!.id) return sendError(res, 'No puedes eliminar tu propia cuenta', 400);

  await prisma.user.update({ where: { id: req.params.id }, data: { status: 'disabled', email: `deleted_${Date.now()}_${user.email}` } });
  await logAudit({ userId: req.user!.id, action: 'DELETE_USER', entityType: 'User', entityId: req.params.id, detailsJson: { name: user.name, email: user.email }, ipAddress: req.ip });
  return sendSuccess(res, null, 'Usuario eliminado');
});

// Get user schedules
router.get('/:id/schedules', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  const schedules = await prisma.schedule.findMany({
    where: {
      assignments: { some: { userId: req.params.id } },
      ...(from && { startDatetime: { gte: new Date(from as string) } }),
      ...(to && { endDatetime: { lte: new Date(to as string) } }),
    },
    include: { assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
    orderBy: { startDatetime: 'asc' },
  });
  return sendSuccess(res, schedules);
});

export default router;
