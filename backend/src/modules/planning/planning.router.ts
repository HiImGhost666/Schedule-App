import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import {
  getAvailabilityController,
  getAvailabilityMatrixController,
  getCoverageRisksController,
} from './planning.controller';

const router = Router();

router.get(
  '/coverage-risks',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getCoverageRisksController(req, res),
);

router.get(
  '/availability',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getAvailabilityController(req, res),
);

router.get(
  '/availability-matrix',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getAvailabilityMatrixController(req, res),
);

export default router;
