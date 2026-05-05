import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

type DepartmentWhere = Prisma.Args<typeof prisma.department, 'findMany'>['where'];
type DepartmentCreateData = Prisma.Args<typeof prisma.department, 'create'>['data'];
type DepartmentUpdateData = Prisma.Args<typeof prisma.department, 'update'>['data'];

export function findDepartmentById(id: string) {
  return prisma.department.findUnique({ where: { id } });
}

export function findDepartmentByBranchAndCode(branchId: string, code: string) {
  return prisma.department.findFirst({ where: { branchId, code } });
}

export function findDepartmentByBranchAndName(branchId: string, name: string) {
  return prisma.department.findFirst({ where: { branchId, name } });
}

export function findDepartmentCodeConflict(branchId: string, code: string, excludedId: string) {
  return prisma.department.findFirst({
    where: { branchId, code, id: { not: excludedId } },
    select: { id: true },
  });
}

export function findDepartmentNameConflict(branchId: string, name: string, excludedId: string) {
  return prisma.department.findFirst({
    where: { branchId, name, id: { not: excludedId } },
    select: { id: true },
  });
}

export function findDepartments(where: DepartmentWhere) {
  return prisma.department.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
}

export function createDepartmentRecord(data: DepartmentCreateData) {
  return prisma.department.create({ data });
}

export function updateDepartmentRecord(departmentId: string, data: DepartmentUpdateData) {
  return prisma.department.update({
    where: { id: departmentId },
    data,
  });
}

export function softDeleteDepartmentRecord(departmentId: string) {
  return prisma.department.update({
    where: { id: departmentId },
    data: { isActive: false },
  });
}

export function hardDeleteDepartmentRecord(departmentId: string) {
  return prisma.department.delete({ where: { id: departmentId } });
}
