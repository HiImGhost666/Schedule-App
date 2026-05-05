import { Prisma } from '@prisma/client';
import { createAppError } from '../../common/errors/error-catalog';
import { logAudit } from '../audit/audit.service';
import { findBranchById } from '../branches/branches.repository';
import {
  createDepartmentRecord,
  findDepartmentByBranchAndCode,
  findDepartmentByBranchAndName,
  findDepartmentById,
  findDepartmentCodeConflict,
  findDepartmentNameConflict,
  findDepartments,
  hardDeleteDepartmentRecord,
  softDeleteDepartmentRecord,
  updateDepartmentRecord,
} from './departments.repository';
import { normalizeDepartmentCode, normalizeDepartmentName } from './domain/departments.rules';
import type { DepartmentActor, DepartmentInput, ListDepartmentsParams } from './domain/departments.types';

async function ensureBranch(branchId: string) {
  const branch = await findBranchById(branchId);
  if (!branch) throw createAppError('BAD_REQUEST', 'La sucursal seleccionada no existe');
  return branch;
}

async function ensureDepartment(departmentId: string) {
  const department = await findDepartmentById(departmentId);
  if (!department) throw createAppError('NOT_FOUND', 'Departamento no encontrado');
  return department;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
  );
}

export async function listDepartments(params: ListDepartmentsParams) {
  await ensureBranch(params.branchId);
  return findDepartments({
    branchId: params.branchId,
    ...(params.includeInactive ? {} : { isActive: true }),
  });
}

export async function createDepartment(data: DepartmentInput, actor: DepartmentActor) {
  await ensureBranch(data.branchId);

  const code = normalizeDepartmentCode(data.code);
  const name = normalizeDepartmentName(data.name);

  const existingByCode = await findDepartmentByBranchAndCode(data.branchId, code);
  if (existingByCode) {
    throw createAppError('CONFLICT', 'Ya existe un departamento con ese codigo');
  }

  const existingByName = await findDepartmentByBranchAndName(data.branchId, name);
  if (existingByName) {
    throw createAppError('CONFLICT', 'Ya existe un departamento con ese nombre');
  }

  try {
    const department = await createDepartmentRecord({
      branchId: data.branchId,
      name,
      code,
      description: data.description,
    });

    await logAudit({
      userId: actor.id,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      detailsJson: { name: department.name, code: department.code, branchId: department.branchId },
      ipAddress: actor.ipAddress,
    });

    return department;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createAppError('CONFLICT', 'Ya existe un departamento con ese nombre o codigo');
    }
    throw error;
  }
}

export async function updateDepartment(departmentId: string, data: Partial<DepartmentInput>, actor: DepartmentActor) {
  const department = await ensureDepartment(departmentId);

  if (data.branchId && data.branchId !== department.branchId) {
    await ensureBranch(data.branchId);
  }

  if (data.code) {
    const code = normalizeDepartmentCode(data.code);
    const conflict = await findDepartmentCodeConflict(data.branchId ?? department.branchId, code, departmentId);
    if (conflict) {
      throw createAppError('CONFLICT', 'Ya existe un departamento con ese codigo');
    }
    data.code = code;
  }

  if (data.name) {
    const name = normalizeDepartmentName(data.name);
    const conflict = await findDepartmentNameConflict(data.branchId ?? department.branchId, name, departmentId);
    if (conflict) {
      throw createAppError('CONFLICT', 'Ya existe un departamento con ese nombre');
    }
    data.name = name;
  }

  try {
    const updated = await updateDepartmentRecord(departmentId, {
      ...data,
      description: data.description,
    });

    await logAudit({
      userId: actor.id,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: departmentId,
      detailsJson: data,
      ipAddress: actor.ipAddress,
    });

    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createAppError('CONFLICT', 'Ya existe un departamento con ese nombre o codigo');
    }
    throw error;
  }
}

export async function deleteDepartment(departmentId: string, actor: DepartmentActor) {
  const department = await ensureDepartment(departmentId);

  await softDeleteDepartmentRecord(departmentId);

  await logAudit({
    userId: actor.id,
    action: 'DELETE_DEPARTMENT',
    entityType: 'Department',
    entityId: departmentId,
    detailsJson: { name: department.name, code: department.code, branchId: department.branchId },
    ipAddress: actor.ipAddress,
  });
}

export async function hardDeleteDepartment(departmentId: string, actor: DepartmentActor) {
  const department = await ensureDepartment(departmentId);

  await hardDeleteDepartmentRecord(departmentId);

  await logAudit({
    userId: actor.id,
    action: 'HARD_DELETE_DEPARTMENT',
    entityType: 'Department',
    entityId: departmentId,
    detailsJson: { name: department.name, code: department.code, branchId: department.branchId },
    ipAddress: actor.ipAddress,
  });
}
