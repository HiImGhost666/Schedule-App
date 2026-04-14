import { Response } from 'express';
import { sendError, sendPaginated, sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { isAppError } from '../../common/errors/app-error';
import {
  changeUserRole,
  changeUserStatus,
  createUser,
  deleteUser,
  getUserById,
  getUserSchedules,
  getUsersList,
  resetUserPassword,
  updateUser,
} from './users.service';

export async function listUsersController(req: AuthRequest, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const search = req.query.search as string | undefined;
  const role = req.query.role as string | undefined;
  const status = req.query.status as string | undefined;

  const { users, total } = await getUsersList({ page, limit, search, role, status });
  return sendPaginated(res, users, total, page, limit);
}

export async function getUserController(req: AuthRequest, res: Response) {
  try {
    const user = await getUserById(req.params.id);
    return sendSuccess(res, user);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details);
    throw error;
  }
}

export async function createUserController(req: AuthRequest, res: Response) {
  try {
    const user = await createUser(req.body, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, user, 'Usuario creado', 201);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details);
    throw error;
  }
}

export async function updateUserController(req: AuthRequest, res: Response) {
  try {
    const updated = await updateUser(req.params.id, req.body, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, updated, 'Usuario actualizado');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details);
    throw error;
  }
}

export async function changeUserStatusController(req: AuthRequest, res: Response) {
  const { status } = req.body;
  if (!['active', 'disabled', 'locked'].includes(status)) return sendError(res, 'Estado inválido', 400);

  try {
    await changeUserStatus(req.params.id, status, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, null, `Estado actualizado a ${status}`);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details);
    throw error;
  }
}

export async function changeUserRoleController(req: AuthRequest, res: Response) {
  const { role } = req.body;
  if (!['admin', 'manager', 'viewer'].includes(role)) return sendError(res, 'Rol inválido', 400);

  try {
    await changeUserRole(req.params.id, role, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, null, 'Rol actualizado');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details);
    throw error;
  }
}

export async function resetPasswordController(req: AuthRequest, res: Response) {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return sendError(res, 'La contraseña debe tener al menos 8 caracteres', 400);

  try {
    await resetUserPassword(req.params.id, newPassword, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, null, 'Contraseña restablecida. El usuario deberá cambiarla en el próximo inicio de sesión');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details);
    throw error;
  }
}

export async function deleteUserController(req: AuthRequest, res: Response) {
  try {
    await deleteUser(req.params.id, { id: req.user!.id, ipAddress: req.ip });
    return sendSuccess(res, null, 'Usuario eliminado');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details);
    throw error;
  }
}

export async function listUserSchedulesController(req: AuthRequest, res: Response) {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const schedules = await getUserSchedules(req.params.id, from, to);
  return sendSuccess(res, schedules);
}
