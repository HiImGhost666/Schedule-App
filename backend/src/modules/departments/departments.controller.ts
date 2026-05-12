import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendError, sendSuccess } from '../../utils/response';
import { isAppError } from '../../common/errors/app-error';
import {
  assignDepartmentManagerBodySchema,
  createDepartmentBodySchema,
  departmentIdParamsSchema,
  listDepartmentsQuerySchema,
  removeDepartmentManagerBodySchema,
  updateDepartmentBodySchema,
} from './departments.http.schemas';
import {
  assignDepartmentManager,
  createDepartment,
  deleteDepartment,
  getDepartmentBranches,
  hardDeleteDepartment,
  listDepartments,
  removeDepartmentManager,
  updateDepartment,
} from './departments.service';

export async function listDepartmentsController(req: AuthRequest, res: Response) {
  const parsed = listDepartmentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 'Parametros invalidos', 400, parsed.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const departments = await listDepartments(parsed.data);
    return sendSuccess(res, departments);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function createDepartmentController(req: AuthRequest, res: Response) {
  const parsedBody = createDepartmentBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos invalidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const created = await createDepartment(parsedBody.data, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, created, 'Departamento creado', 201);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function updateDepartmentController(req: AuthRequest, res: Response) {
  const parsedParams = departmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parametros invalidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = updateDepartmentBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos invalidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const updated = await updateDepartment(parsedParams.data.departmentId, parsedBody.data, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, updated, 'Departamento actualizado');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function deleteDepartmentController(req: AuthRequest, res: Response) {
  const parsedParams = departmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parametros invalidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  try {
    await deleteDepartment(parsedParams.data.departmentId, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Departamento desactivado');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function hardDeleteDepartmentController(req: AuthRequest, res: Response) {
  const parsedParams = departmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parametros invalidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  try {
    await hardDeleteDepartment(parsedParams.data.departmentId, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, null, 'Departamento eliminado definitivamente');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function listDepartmentBranchesController(req: AuthRequest, res: Response) {
  const parsedParams = departmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parametros invalidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const branches = await getDepartmentBranches(parsedParams.data.departmentId);
    return sendSuccess(res, branches);
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function assignDepartmentManagerController(req: AuthRequest, res: Response) {
  const parsedParams = departmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parametros invalidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = assignDepartmentManagerBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos invalidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const updated = await assignDepartmentManager(parsedParams.data.departmentId, parsedBody.data.userId, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, updated, 'Manager asignado al departamento');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}

export async function removeDepartmentManagerController(req: AuthRequest, res: Response) {
  const parsedParams = departmentIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return sendError(res, 'Parametros invalidos', 400, parsedParams.error.flatten(), 'BAD_REQUEST');
  }

  const parsedBody = removeDepartmentManagerBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return sendError(res, 'Datos invalidos', 400, parsedBody.error.flatten(), 'BAD_REQUEST');
  }

  try {
    const updated = await removeDepartmentManager(parsedParams.data.departmentId, parsedBody.data.userId, {
      id: req.user!.id,
      ipAddress: req.ip,
    });
    return sendSuccess(res, updated, 'Manager removido del departamento');
  } catch (error) {
    if (isAppError(error)) return sendError(res, error.message, error.statusCode, error.details, error.code);
    throw error;
  }
}
