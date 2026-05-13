import { Response } from 'express';
import { sendError, sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { isAppError } from '../../common/errors/app-error';
import {
  listVacations,
  getVacationById,
  createVacationEntry,
  approveVacationEntry,
  rejectVacationEntry,
  cancelVacationEntry,
  getVacationCalendar,
} from './vacations.service';
import {
  createVacationRequestSchema,
  approveVacationSchema,
  rejectVacationSchema,
  vacationIdParamsSchema,
  listVacationsQuerySchema,
  vacationCalendarQuerySchema,
} from './vacations.http.schemas';

function buildActor(req: AuthRequest) {
  return {
    id: req.user!.id,
    roleName: req.user!.roleName!,
    email: req.user!.email,
    name: req.user!.name,
    branchId: req.user!.branchId,
    visibleBranchIds: req.user!.visibleBranchIds ?? [],
    departmentId: req.user!.departmentId,
    ipAddress: req.ip,
    permissions: req.user!.permissions ?? [],
  };
}

/**
 * Lista solicitudes de vacaciones
 */
export async function listVacationsController(req: AuthRequest, res: Response) {
  const parsed = listVacationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const vacations = await listVacations(parsed.data, buildActor(req));
    return sendSuccess(res, vacations);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

/**
 * Obtiene una solicitud por ID
 */
export async function getVacationController(req: AuthRequest, res: Response) {
  const parsed = vacationIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const vacation = await getVacationById(parsed.data.id, buildActor(req));
    return sendSuccess(res, vacation);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

/**
 * Crea una solicitud de vacaciones (Employee)
 * Si hay solapamiento con compañeros del departamento, la solicitud se crea
 * con estado 'colindante' y se devuelve información de los afectados.
 */
export async function createVacationController(req: AuthRequest, res: Response) {
  const parsed = createVacationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Datos inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const result = await createVacationEntry(parsed.data, buildActor(req));

    // Extraer metadatos de solapamiento para el mensaje
    const { hasOverlap, overlappingEmployees, ...vacation } = result as any;
    const message = hasOverlap
      ? 'Solicitud de vacaciones creada con advertencia: coincide con las vacaciones de compañeros del departamento'
      : 'Solicitud de vacaciones creada';

    return sendSuccess(res, {
      ...vacation,
      hasOverlap,
      overlappingEmployees,
    }, message, 201);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

/**
 * Aprueba una solicitud de vacaciones (Manager)
 */
export async function approveVacationController(req: AuthRequest, res: Response) {
  const parsedParams = vacationIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = approveVacationSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const vacation = await approveVacationEntry(parsedParams.data.id, parsedBody.data, buildActor(req));
    return sendSuccess(res, vacation, 'Vacaciones aprobadas');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

/**
 * Rechaza una solicitud de vacaciones (Manager)
 */
export async function rejectVacationController(req: AuthRequest, res: Response) {
  const parsedParams = vacationIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = rejectVacationSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const vacation = await rejectVacationEntry(parsedParams.data.id, parsedBody.data, buildActor(req));
    return sendSuccess(res, vacation, 'Vacaciones rechazadas');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

/**
 * Cancela una solicitud de vacaciones (Employee)
 */
export async function cancelVacationController(req: AuthRequest, res: Response) {
  const parsed = vacationIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const vacation = await cancelVacationEntry(parsed.data.id, buildActor(req));
    return sendSuccess(res, vacation, 'Solicitud de vacaciones cancelada');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

/**
 * Obtiene el calendario de vacaciones aprobadas
 */
export async function getVacationCalendarController(req: AuthRequest, res: Response) {
  const parsed = vacationCalendarQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const calendar = await getVacationCalendar(
      parsed.data.year,
      parsed.data.week,
      parsed.data.branchId,
      parsed.data.departmentId,
      parsed.data.employeeId,
      buildActor(req),
      parsed.data.from,
      parsed.data.to,
    );
    return sendSuccess(res, calendar);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}
