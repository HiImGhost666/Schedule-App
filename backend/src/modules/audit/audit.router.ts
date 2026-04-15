import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { getAuditLogController, listAuditLogsController, rollbackAuditController } from './audit.controller';

const router = Router();

router.get('/', authMiddleware, requireRole('admin'), listAuditLogsController);
router.get('/:id', authMiddleware, requireRole('admin'), getAuditLogController);
router.post('/:id/rollback', authMiddleware, requireRole('admin'), rollbackAuditController);

export default router;
