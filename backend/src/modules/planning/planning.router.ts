import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import {
  getAvailabilityController,
  getAvailabilityMatrixController,
  getCoverageRisksController,
  getCrisisModeController,
  getEquityController,
  getNotificationPreferencesController,
  getSubstituteSuggestionsController,
  getTemplatePreviewController,
  getTimelineController,
  listSupportRequestsController,
  createSupportRequestController,
  reviewSupportRequestController,
  updateNotificationPreferencesController,
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
  '/substitutes',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getSubstituteSuggestionsController(req, res),
);

router.get(
  '/availability-matrix',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getAvailabilityMatrixController(req, res),
);

router.get(
  '/equity',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getEquityController(req, res),
);

router.get(
  '/timeline',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getTimelineController(req, res),
);

router.get(
  '/crisis',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getCrisisModeController(req, res),
);

router.get(
  '/template-preview',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => getTemplatePreviewController(req, res),
);

router.get(
  '/support-requests',
  authMiddleware,
  requirePermission('schedules:view'),
  (req: AuthRequest, res: Response) => listSupportRequestsController(req, res),
);

router.post(
  '/support-requests',
  authMiddleware,
  requirePermission('schedules:create'),
  (req: AuthRequest, res: Response) => createSupportRequestController(req, res),
);

router.patch(
  '/support-requests/:id',
  authMiddleware,
  requirePermission('schedules:update'),
  (req: AuthRequest, res: Response) => reviewSupportRequestController(req, res),
);

router.get(
  '/notification-preferences',
  authMiddleware,
  (req: AuthRequest, res: Response) => getNotificationPreferencesController(req, res),
);

router.patch(
  '/notification-preferences',
  authMiddleware,
  (req: AuthRequest, res: Response) => updateNotificationPreferencesController(req, res),
);

export default router;
