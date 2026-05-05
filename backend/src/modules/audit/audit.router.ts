import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { getAuditLogController, listAuditLogsController, rollbackAuditController } from './audit.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('audit:view'), listAuditLogsController);
router.get('/:id', authMiddleware, requirePermission('audit:view'), getAuditLogController);
router.post('/:id/rollback', authMiddleware, requirePermission('audit:view'), rollbackAuditController);

export default router;
