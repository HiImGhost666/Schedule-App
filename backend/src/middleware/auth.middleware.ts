import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { prisma } from '../config/database';
import { USER_STATUS } from '../config/constants';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
    branchId: string | null;
  };
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'Token de acceso requerido', 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        status: true,
        branchId: true,
      },
    });

    if (!user) {
      return sendError(res, 'Token inválido o usuario no disponible', 401);
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return sendError(res, 'Tu cuenta no está activa', 403, null, 'FORBIDDEN');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      branchId: user.branchId,
    };

    return next();
  } catch {
    return sendError(res, 'Token inválido o expirado', 401);
  }
}
