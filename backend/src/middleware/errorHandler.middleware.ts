import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error(`${err.message}`, err);
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
}
