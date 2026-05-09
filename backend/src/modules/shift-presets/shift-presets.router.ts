import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import {
  listShiftPresetsController,
  getShiftPresetController,
  createShiftPresetController,
  updateShiftPresetController,
  deleteShiftPresetController,
} from './shift-presets.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('shift_presets:read'), listShiftPresetsController);
router.get('/:id', requirePermission('shift_presets:read'), getShiftPresetController);
router.post('/', requirePermission('shift_presets:create'), createShiftPresetController);
router.patch('/:id', requirePermission('shift_presets:update'), updateShiftPresetController);
router.delete('/:id', requirePermission('shift_presets:delete'), deleteShiftPresetController);

export default router;
