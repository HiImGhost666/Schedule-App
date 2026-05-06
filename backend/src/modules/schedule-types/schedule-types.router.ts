import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { sendError, sendSuccess } from '../../utils/response';
import { SCHEDULE_TYPE_PERMISSIONS } from './schedule-types.constants';
import {
  getScheduleTypes,
  getScheduleTypeById,
  createScheduleType,
  updateScheduleType,
  deleteScheduleType,
} from './schedule-types.service';
import {
  createScheduleTypeSchema,
  updateScheduleTypeSchema,
} from './schedule-types.http.schemas';

const router = Router();

// GET /schedule-types - List all active schedule types (public)
router.get('/', async (req, res) => {
  try {
    const scheduleTypes = await getScheduleTypes();
    sendSuccess(res, scheduleTypes);
  } catch (error) {
    sendError(res, 'Error al obtener tipos de turno', 500);
  }
});

// GET /schedule-types/:id - Get schedule type by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const scheduleType = await getScheduleTypeById(req.params.id as string);
    sendSuccess(res, scheduleType);
  } catch (error) {
    sendError(res, 'Tipo de turno no encontrado', 404);
  }
});

// POST /schedule-types - Create new schedule type
router.post(
  '/',
  authMiddleware,
  requirePermission(SCHEDULE_TYPE_PERMISSIONS.CREATE),
  async (req, res) => {
    const parsed = createScheduleTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
    }

    try {
      const scheduleType = await createScheduleType(parsed.data);
      sendSuccess(res, scheduleType, undefined, 201);
    } catch (error: any) {
      sendError(res, error.message || 'Error al crear tipo de turno', 400);
    }
  }
);

// PUT /schedule-types/:id - Update schedule type
router.put(
  '/:id',
  authMiddleware,
  requirePermission(SCHEDULE_TYPE_PERMISSIONS.UPDATE),
  async (req, res) => {
    const parsed = updateScheduleTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
    }

    try {
      const scheduleType = await updateScheduleType(req.params.id as string, parsed.data);
      sendSuccess(res, scheduleType);
    } catch (error: any) {
      sendError(res, error.message || 'Error al actualizar tipo de turno', 400);
    }
  }
);

// DELETE /schedule-types/:id - Soft delete schedule type
router.delete(
  '/:id',
  authMiddleware,
  requirePermission(SCHEDULE_TYPE_PERMISSIONS.DELETE),
  async (req, res) => {
    try {
      await deleteScheduleType(req.params.id as string);
      sendSuccess(res, { message: 'Schedule type deleted successfully' });
    } catch (error: any) {
      sendError(res, error.message || 'Error al eliminar tipo de turno', 400);
    }
  }
);

export default router;