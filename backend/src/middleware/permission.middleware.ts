import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { PermissionName } from '../modules/roles/roles.constants';

export function requirePermission(...requiredPermissions: PermissionName[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (req.user.status === 'locked' || req.user.status === 'disabled') {
      return res.status(403).json({ error: 'La cuenta está bloqueada o deshabilitada' });
    }

    const userPermissions = req.user.permissions || [];

    // Si no se requiere ningún permiso específico, o si el usuario tiene TODOS los permisos requeridos
    const hasPermission = requiredPermissions.every(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({ error: 'No tienes los permisos necesarios para realizar esta acción' });
    }

    return next();
  };
}
