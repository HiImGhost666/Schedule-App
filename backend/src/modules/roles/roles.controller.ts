import { Request, Response } from 'express';
import * as service from './roles.service';
import { sendSuccess, sendError } from '../../utils/response';

export async function listRolesController(_req: Request, res: Response) {
  try {
    const roles = await service.listRoles();
    sendSuccess(res, roles);
  } catch (err: any) {
    sendError(res, err.message, 400);
  }
}

export async function getRoleController(req: Request, res: Response) {
  try {
    const role = await service.getRole(req.params.id as string);
    sendSuccess(res, role);
  } catch (err: any) {
    sendError(res, err.message, 404);
  }
}

export async function createRoleController(req: Request, res: Response) {
  try {
    const role = await service.createRole(req.body);
    sendSuccess(res, role, undefined, 201);
  } catch (err: any) {
    sendError(res, err.message, 400);
  }
}

export async function updateRoleController(req: Request, res: Response) {
  try {
    const role = await service.updateRole(req.params.id as string, req.body);
    sendSuccess(res, role);
  } catch (err: any) {
    sendError(res, err.message, 400);
  }
}

export async function deleteRoleController(req: Request, res: Response) {
  try {
    await service.deleteRole(req.params.id as string);
    sendSuccess(res, { message: 'Role eliminado' });
  } catch (err: any) {
    sendError(res, err.message, 400);
  }
}

export async function listPermissionsController(_req: Request, res: Response) {
  try {
    const perms = await service.listPermissions();
    sendSuccess(res, perms);
  } catch (err: any) {
    sendError(res, err.message, 400);
  }
}
