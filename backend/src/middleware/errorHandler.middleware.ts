import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { isAppError } from '../common/errors/app-error';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error(`${err.message}`, err);

  if (isAppError(err)) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  });
}
