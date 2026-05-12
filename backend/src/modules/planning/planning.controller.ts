import type { Response } from 'express';
import { isAppError } from '../../common/errors/app-error';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { sendError, sendSuccess } from '../../utils/response';
import { planningService } from './planning.service';
import type { PlanningActor } from './planning.types';
import {
  notificationPreferencesBodySchema,
  planningRangeQuerySchema,
  planningSubstitutesQuerySchema,
  planningTemplatePreviewQuerySchema,
  supportRequestBodySchema,
  supportRequestParamsSchema,
  supportRequestReviewBodySchema,
} from './planning.validation';

function buildPlanningActor(req: AuthRequest): PlanningActor {
  return {
    id: req.user!.id,
    roleName: req.user!.roleName!,
    branchId: req.user!.branchId,
    departmentId: req.user!.departmentId,
    permissions: req.user!.permissions ?? [],
    visibleBranchIds: req.user!.visibleBranchIds ?? [],
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

export async function getSubstituteSuggestionsController(req: AuthRequest, res: Response) {
  const parsed = planningSubstitutesQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendError(res, 'Parametros invalidos', 400, parsed.error.flatten(), 'BAD_REQUEST');

  try {
    const suggestions = await planningService.getSubstituteSuggestions(parsed.data, buildPlanningActor(req));
    return sendSuccess(res, suggestions);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function getEquityController(req: AuthRequest, res: Response) {
  const filters = parseRangeQuery(req, res);
  if (!filters) return;

  try {
    const equity = await planningService.getEquity(filters, buildPlanningActor(req));
    return sendSuccess(res, equity);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function getTimelineController(req: AuthRequest, res: Response) {
  const filters = parseRangeQuery(req, res);
  if (!filters) return;

  try {
    const timeline = await planningService.getTimeline(filters, buildPlanningActor(req));
    return sendSuccess(res, timeline);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function getCrisisModeController(req: AuthRequest, res: Response) {
  const filters = parseRangeQuery(req, res);
  if (!filters) return;

  try {
    const crisis = await planningService.getCrisisMode(filters, buildPlanningActor(req));
    return sendSuccess(res, crisis);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function getTemplatePreviewController(req: AuthRequest, res: Response) {
  const parsed = planningTemplatePreviewQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendError(res, 'Parametros invalidos', 400, parsed.error.flatten(), 'BAD_REQUEST');

  try {
    const preview = await planningService.getTemplatePreview(parsed.data, buildPlanningActor(req));
    return sendSuccess(res, preview);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function listSupportRequestsController(req: AuthRequest, res: Response) {
  const filters = parseRangeQuery(req, res);
  if (!filters) return;

  try {
    const requests = await planningService.listSupportRequests(filters, buildPlanningActor(req));
    return sendSuccess(res, requests);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function createSupportRequestController(req: AuthRequest, res: Response) {
  const parsed = supportRequestBodySchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos invalidos', 400, parsed.error.flatten(), 'BAD_REQUEST');

  try {
    const request = await planningService.createSupportRequest(parsed.data, buildPlanningActor(req));
    return sendSuccess(res, request, 'Solicitud de apoyo creada', 201);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function reviewSupportRequestController(req: AuthRequest, res: Response) {
  const parsedParams = supportRequestParamsSchema.safeParse(req.params);
  const parsedBody = supportRequestReviewBodySchema.safeParse(req.body);
  if (!parsedParams.success) return sendError(res, 'Parametros invalidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  if (!parsedBody.success) return sendError(res, 'Datos invalidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');

  try {
    const request = await planningService.reviewSupportRequest(
      parsedParams.data.id,
      parsedBody.data.status,
      buildPlanningActor(req),
    );
    return sendSuccess(res, request, 'Solicitud de apoyo actualizada');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function getNotificationPreferencesController(req: AuthRequest, res: Response) {
  try {
    const preferences = await planningService.getNotificationPreferences(buildPlanningActor(req));
    return sendSuccess(res, preferences);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function updateNotificationPreferencesController(req: AuthRequest, res: Response) {
  const parsed = notificationPreferencesBodySchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Datos invalidos', 400, parsed.error.flatten(), 'BAD_REQUEST');

  try {
    const preferences = await planningService.updateNotificationPreferences(buildPlanningActor(req), parsed.data);
    return sendSuccess(res, preferences, 'Preferencias actualizadas');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}
