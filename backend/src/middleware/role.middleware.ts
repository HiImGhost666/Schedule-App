import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'No autenticado', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'No tienes permisos para realizar esta acción', 403);
    }
    return next();
  };
}
