import { createAppError } from '../../common/errors/error-catalog';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import { logAuditOrThrow } from '../audit/audit.service';
import { findBranchById } from '../branches/branches.repository';
import {
  createDepartmentRecord,
  findDepartmentByCode,
  findDepartmentByName,
  findDepartmentById,
  findDepartmentBranchIds,
  findDepartmentCodeConflict,
  findDepartmentNameConflict,
  findDepartmentBranches,
  findDepartmentsByBranch,
  findDepartments,
  hardDeleteDepartmentRecord,
  removeDepartmentBranches,
  softDeleteDepartmentRecord,
  setDepartmentBranches,
  updateDepartmentRecord,
} from './departments.repository';
import { normalizeDepartmentCode, normalizeDepartmentName } from './domain/departments.rules';
import type { DepartmentActor, DepartmentInput, ListDepartmentsParams } from './domain/departments.types';

async function ensureBranch(branchId: string) {
  const branch = await findBranchById(branchId);
  if (!branch) throw createAppError('BAD_REQUEST', 'La sucursal seleccionada no existe');
  return branch;
}

async function ensureBranchesExist(branchIds: string[]) {
  const branches = await Promise.all(branchIds.map((branchId) => findBranchById(branchId)));
  const missing = branchIds.filter((_, index) => !branches[index]);
  if (missing.length > 0) {
    throw createAppError('BAD_REQUEST', `Las siguientes sucursales no existen: ${missing.join(', ')}`);
  }
}

async function ensureDepartment(departmentId: string) {
  const department = await findDepartmentById(departmentId);
  if (!department) throw createAppError('NOT_FOUND', 'Departamento no encontrado');
  return department;
}

async function buildDepartmentSnapshot(departmentId: string, tx?: Parameters<typeof findDepartmentById>[1]) {
  const [department, branchLinks] = await Promise.all([
    findDepartmentById(departmentId, tx),
    findDepartmentBranchIds(departmentId, tx),
  ]);

  if (!department) {
    throw createAppError('NOT_FOUND', 'Departamento no encontrado');
  }

  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description ?? null,
    isActive: department.isActive,
    branchIds: branchLinks.map((link) => link.branchId),
    userCount: department._count?.users ?? 0,
  };
}

export async function listDepartments(params: ListDepartmentsParams) {
  if (params.branchId) {
    await ensureBranch(params.branchId);
    return findDepartmentsByBranch(params.branchId, params.includeInactive);
  }
  return findDepartments(params.includeInactive ? {} : { isActive: true });
}

export async function createDepartment(data: DepartmentInput, actor: DepartmentActor) {
  if (!data.branchIds?.length) {
    throw createAppError('BAD_REQUEST', 'Debe seleccionar al menos una sucursal');
  }
  await ensureBranchesExist(data.branchIds);

  const code = normalizeDepartmentCode(data.code);
  const name = normalizeDepartmentName(data.name);

  const existingByCode = await findDepartmentByCode(code);
  if (existingByCode) {
    throw createAppError('CONFLICT', 'Ya existe un departamento con ese código');
  }

  const existingByName = await findDepartmentByName(name);
  if (existingByName) {
    throw createAppError('CONFLICT', 'Ya existe un departamento con ese nombre');
  }

  return executeInTransaction(async (tx) => {
    const department = await createDepartmentRecord({
      name,
      code,
      description: data.description,
    }, tx);

    await setDepartmentBranches(department.id, data.branchIds, tx);

    const after = await buildDepartmentSnapshot(department.id, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      detailsJson: { before: null, after },
      ipAddress: actor.ipAddress,
    }, tx);

    return department;
  });
}

export async function updateDepartment(departmentId: string, data: Partial<DepartmentInput>, actor: DepartmentActor) {
  const before = await buildDepartmentSnapshot(departmentId);

  if (data.branchIds) {
    if (!data.branchIds.length) {
      throw createAppError('BAD_REQUEST', 'Debe seleccionar al menos una sucursal');
    }
    await ensureBranchesExist(data.branchIds);
  }

  if (data.code) {
    const code = normalizeDepartmentCode(data.code);
    const conflict = await findDepartmentCodeConflict(code, departmentId);
    if (conflict) {
      throw createAppError('CONFLICT', 'Ya existe un departamento con ese código');
    }
    data.code = code;
  }

  if (data.name) {
    const name = normalizeDepartmentName(data.name);
    const conflict = await findDepartmentNameConflict(name, departmentId);
    if (conflict) {
      throw createAppError('CONFLICT', 'Ya existe un departamento con ese nombre');
    }
    data.name = name;
  }

  return executeInTransaction(async (tx) => {
    const updated = await updateDepartmentRecord(departmentId, {
      ...data,
      description: data.description,
    }, tx);

    if (data.branchIds) {
      await removeDepartmentBranches(departmentId, tx);
      await setDepartmentBranches(departmentId, data.branchIds, tx);
    }

    const after = await buildDepartmentSnapshot(departmentId, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: departmentId,
      detailsJson: { before, after },
      ipAddress: actor.ipAddress,
    }, tx);

    return updated;
  });
}

export async function deleteDepartment(departmentId: string, actor: DepartmentActor) {
  const before = await buildDepartmentSnapshot(departmentId);

  await executeInTransaction(async (tx) => {
    await softDeleteDepartmentRecord(departmentId, tx);
    const after = await buildDepartmentSnapshot(departmentId, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'DELETE_DEPARTMENT',
      entityType: 'Department',
      entityId: departmentId,
      detailsJson: { before, after },
      ipAddress: actor.ipAddress,
    }, tx);
  });
}

export async function hardDeleteDepartment(departmentId: string, actor: DepartmentActor) {
  const before = await buildDepartmentSnapshot(departmentId);

  const userCount = before.userCount;
  if (userCount > 0) {
    throw createAppError(
      'BAD_REQUEST',
      `No se puede eliminar: ${userCount} usuario(s) están asignados a este departamento. Desasigna los usuarios primero.`,
      { linkedUsers: userCount },
    );
  }

  await executeInTransaction(async (tx) => {
    await removeDepartmentBranches(departmentId, tx);
    await hardDeleteDepartmentRecord(departmentId, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'HARD_DELETE_DEPARTMENT',
      entityType: 'Department',
      entityId: departmentId,
      detailsJson: { before, after: null },
      ipAddress: actor.ipAddress,
    }, tx);
  });
}

export async function getDepartmentBranches(departmentId: string) {
  await ensureDepartment(departmentId);
  return findDepartmentBranches(departmentId);
}
