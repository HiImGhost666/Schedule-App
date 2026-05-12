import type { Response } from 'express';
import { isAppError } from '../../common/errors/app-error';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { sendError, sendSuccess } from '../../utils/response';
import { planningService } from './planning.service';
import type { PlanningActor } from './planning.types';
import { planningRangeQuerySchema } from './planning.validation';

function buildPlanningActor(req: AuthRequest): PlanningActor {
  return {
    id: req.user!.id,
    roleName: req.user!.roleName!,
    branchId: req.user!.branchId,
    departmentId: req.user!.departmentId,
    permissions: req.user!.permissions ?? [],
  };
}

function parseRangeQuery(req: AuthRequest, res: Response) {
  const parsed = planningRangeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 'Parametros invalidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
    return null;
  }
  return parsed.data;
}

/**
 * Get coverage risks for the planning dashboard.
 */
export async function getCoverageRisksController(req: AuthRequest, res: Response) {
  const filters = parseRangeQuery(req, res);
  if (!filters) return;

  try {
    const risks = await planningService.getCoverageRisks(filters, buildPlanningActor(req));
    return sendSuccess(res, risks);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

/**
 * Get employee availability for the planning dashboard.
 */
export async function getAvailabilityController(req: AuthRequest, res: Response) {
  const filters = parseRangeQuery(req, res);
  if (!filters) return;

  try {
    const availability = await planningService.getAvailability(filters, buildPlanningActor(req));
    return sendSuccess(res, availability);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

/**
 * Get daily availability matrix for the planning dashboard.
 */
export async function getAvailabilityMatrixController(req: AuthRequest, res: Response) {
  const filters = parseRangeQuery(req, res);
  if (!filters) return;

  try {
    const matrix = await planningService.getAvailabilityMatrix(filters, buildPlanningActor(req));
    return sendSuccess(res, matrix);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}
