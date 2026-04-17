import { Response } from 'express';
import { sendError, sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';
import { isAppError } from '../../common/errors/app-error';
import {
  branchIdParamsSchema,
  createBranchBodySchema,
  createBranchHolidayBodySchema,
  holidayIdParamsSchema,
  listBranchesQuerySchema,
  listBranchHolidaysQuerySchema,
  updateBranchBodySchema,
  updateBranchHolidayBodySchema,
} from './branches.http.schemas';
import {
  createBranch,
  createBranchHoliday,
  deleteBranch,
  deleteBranchHoliday,
  hardDeleteBranch,
  listBranches,
  listBranchHolidays,
  updateBranch,
  updateBranchHoliday,
} from './branches.service';

export async function listBranchesController(req: AuthRequest, res: Response) {
  const parsed = listBranchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const isAdmin = req.user!.role === 'admin';
    const branches = await listBranches({
      includeInactive: isAdmin ? parsed.data.includeInactive : true,
    });

    if (isAdmin) {
      return sendSuccess(res, branches);
    }

    if (!req.user!.branchId) {
      return sendSuccess(res, []);
    }

    const scoped = branches.filter((branch) => branch.id === req.user!.branchId);
    return sendSuccess(res, scoped);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function createBranchController(req: AuthRequest, res: Response) {
  const parsedBody = createBranchBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const created = await createBranch(parsedBody.data, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, created, 'Sucursal creada', 201);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function updateBranchController(req: AuthRequest, res: Response) {
  const parsedParams = branchIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = updateBranchBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const updated = await updateBranch(parsedParams.data.branchId, parsedBody.data, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, updated, 'Sucursal actualizada');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function deleteBranchController(req: AuthRequest, res: Response) {
  const parsedParams = branchIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  try {
    await deleteBranch(parsedParams.data.branchId, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Sucursal desactivada');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function hardDeleteBranchController(req: AuthRequest, res: Response) {
  const parsedParams = branchIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  try {
    await hardDeleteBranch(parsedParams.data.branchId, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Sucursal eliminada definitivamente');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function listBranchHolidaysController(req: AuthRequest, res: Response) {
  const parsedParams = branchIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedQuery = listBranchHolidaysQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedQuery.error.flatten(), 'BAD_REQUEST');
  }

  const isAdmin = req.user!.role === 'admin';
  if (!isAdmin) {
    if (!req.user!.branchId) {
      return sendError(res, 'No tienes una sucursal asignada', 403, null, 'FORBIDDEN');
    }
    if (req.user!.branchId !== parsedParams.data.branchId) {
      return sendError(res, 'No tienes permisos para consultar festivos de otra sucursal', 403, null, 'FORBIDDEN');
    }
  }

  try {
    const holidays = await listBranchHolidays(parsedParams.data.branchId, parsedQuery.data);
    return sendSuccess(res, holidays);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function createBranchHolidayController(req: AuthRequest, res: Response) {
  const parsedParams = branchIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = createBranchHolidayBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const created = await createBranchHoliday(parsedParams.data.branchId, parsedBody.data, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, created, 'Festivo creado', 201);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function updateBranchHolidayController(req: AuthRequest, res: Response) {
  const parsedParams = holidayIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = updateBranchHolidayBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos inválidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const updated = await updateBranchHoliday(parsedParams.data.branchId, parsedParams.data.holidayId, parsedBody.data, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, updated, 'Festivo actualizado');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function deleteBranchHolidayController(req: AuthRequest, res: Response) {
  const parsedParams = holidayIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parámetros inválidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  try {
    await deleteBranchHoliday(parsedParams.data.branchId, parsedParams.data.holidayId, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Festivo eliminado');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}
