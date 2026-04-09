import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { login, refreshTokens, logout } from './auth.service';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../audit/audit.service';
import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/bcrypt';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Email y contraseña requeridos', 400);
  }

  try {
    const result = await login(
      parsed.data.email,
      parsed.data.password,
      req.ip,
      req.headers['user-agent']
    );

    await logAudit({
      userId: result.user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: result.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, result, 'Login exitoso');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error de autenticación';
    return sendError(res, message, 401);
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return sendError(res, 'Refresh token requerido', 400);

  try {
    const tokens = await refreshTokens(refreshToken);
    return sendSuccess(res, tokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al renovar token';
    return sendError(res, message, 401);
  }
});

router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) await logout(refreshToken);

  await logAudit({
    userId: req.user?.id,
    action: 'LOGOUT',
    entityType: 'User',
    entityId: req.user?.id,
    ipAddress: req.ip,
  });

  return sendSuccess(res, null, 'Sesión cerrada');
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      department: true,
      createdAt: true,
      lastLoginAt: true,
      forcePasswordChange: true,
    },
  });
  if (!user) return sendError(res, 'Usuario no encontrado', 404);
  return sendSuccess(res, user);
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.patch('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400);

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return sendError(res, 'Usuario no encontrado', 404);

  const { comparePassword } = await import('../../utils/bcrypt');
  const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return sendError(res, 'Contraseña actual incorrecta', 400);

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, forcePasswordChange: false },
  });

  await logAudit({
    userId: req.user!.id,
    action: 'CHANGE_PASSWORD',
    entityType: 'User',
    entityId: req.user!.id,
    ipAddress: req.ip,
  });

  return sendSuccess(res, null, 'Contraseña actualizada correctamente');
});

export default router;
