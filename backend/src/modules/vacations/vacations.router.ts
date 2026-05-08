import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { VACATION_PERMISSIONS } from './vacations.constants';
import {
  listVacationsController,
  getVacationController,
  createVacationController,
  approveVacationController,
  rejectVacationController,
  cancelVacationController,
  getVacationCalendarController,
} from './vacations.controller';

const router = Router();

// GET /api/vacations/calendar - Calendario de vacaciones aprobadas (debe ir antes de /:id)
// Todos los autenticados pueden ver el calendario (filtrado por scope según su rol)
router.get('/calendar', authMiddleware, requirePermission(VACATION_PERMISSIONS.READ), (req: AuthRequest, res: Response) => getVacationCalendarController(req, res));

// GET /api/vacations - Listar solicitudes
// read: ve las propias; read-all: ve las del scope (branch/depto/global)
router.get('/', authMiddleware, requirePermission(VACATION_PERMISSIONS.READ), (req: AuthRequest, res: Response) => listVacationsController(req, res));

// GET /api/vacations/:id - Obtener solicitud por ID
router.get('/:id', authMiddleware, requirePermission(VACATION_PERMISSIONS.READ), (req: AuthRequest, res: Response) => getVacationController(req, res));

// POST /api/vacations - Crear solicitud (employee/manager/admin)
router.post('/', authMiddleware, requirePermission(VACATION_PERMISSIONS.CREATE), (req: AuthRequest, res: Response) => createVacationController(req, res));

// PATCH /api/vacations/:id/approve - Aprobar (manager/admin)
router.patch('/:id/approve', authMiddleware, requirePermission(VACATION_PERMISSIONS.APPROVE), (req: AuthRequest, res: Response) => approveVacationController(req, res));

// PATCH /api/vacations/:id/reject - Rechazar (manager/admin)
router.patch('/:id/reject', authMiddleware, requirePermission(VACATION_PERMISSIONS.APPROVE), (req: AuthRequest, res: Response) => rejectVacationController(req, res));

// DELETE /api/vacations/:id - Cancelar (employee solo propias, manager/admin cualquieras del scope)
router.delete('/:id', authMiddleware, requirePermission(VACATION_PERMISSIONS.CANCEL), (req: AuthRequest, res: Response) => cancelVacationController(req, res));

export default router;
