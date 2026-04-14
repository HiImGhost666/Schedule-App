import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { logAudit } from '../audit/audit.service';
import { changePassword, login, logout, refreshTokens } from './auth.service';
import { isAppError } from '../../common/errors/app-error';
import { getMe } from './auth.service';

const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(1),
}).refine((data) => Boolean(data.identifier || data.email), {
  message: 'Usuario/email y contraseña requeridos',
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function loginController(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Usuario/email y contraseña requeridos', 400);
  }

  try {
    const identifier = parsed.data.identifier ?? parsed.data.email!;
    const result = await login(
      identifier,
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
    if (isAppError(err)) {
      return sendError(res, err.message, err.statusCode, err.details);
    }
    const message = err instanceof Error ? err.message : 'Error de autenticación';
    return sendError(res, message, 401);
  }
}

export async function refreshController(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return sendError(res, 'Refresh token requerido', 400);

  try {
    const tokens = await refreshTokens(refreshToken);
    return sendSuccess(res, tokens);
  } catch (err: unknown) {
    if (isAppError(err)) {
      return sendError(res, err.message, err.statusCode, err.details);
    }
    const message = err instanceof Error ? err.message : 'Error al renovar token';
    return sendError(res, message, 401);
  }
}

export async function logoutController(req: AuthRequest, res: Response) {
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
}

export async function meController(req: AuthRequest, res: Response) {
  try {
    const user = await getMe(req.user!.id);
    return sendSuccess(res, user);
  } catch (err: unknown) {
    if (isAppError(err)) {
      return sendError(res, err.message, err.statusCode, err.details);
    }
    throw err;
  }
}

export async function changePasswordController(req: AuthRequest, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos inválidos', 400);

  try {
    await changePassword(req.user!.id, parsed.data.currentPassword, parsed.data.newPassword);
    await logAudit({
      userId: req.user!.id,
      action: 'CHANGE_PASSWORD',
      entityType: 'User',
      entityId: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Contraseña actualizada correctamente');
  } catch (err: unknown) {
    if (isAppError(err)) {
      return sendError(res, err.message, err.statusCode, err.details);
    }
    throw err;
  }
}
