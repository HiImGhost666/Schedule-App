import { prisma } from '../../config/database';
import { createAppError } from '../../common/errors/error-catalog';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import { notifyVacationChange } from '../notifications/notifications.service';
import { createInAppNotification } from '../in-app-notifications/in-app.service';
import { VACATION_PERMISSIONS } from './vacations.constants';
import {
  findVacationRequests,
  countVacationRequests,
  findVacationRequestById,
  createVacationRequest,
  updateVacationRequest,
  countPendingOverlap,
  findDepartmentOverlap,
} from './vacations.repository';
import {
  ensureStartDateNotPast,
  ensureValidDateRange,
  ensureCanReview,
  ensureCanCancel,
  ensureIsPending,
} from './domain/vacations.rules';
import type { CreateVacationRequestInput, ApproveVacationInput, RejectVacationInput, ListVacationsQuery } from './vacations.http.schemas';

type Actor = {
  id: string;
  roleName: string;
  email: string;
  name: string;
  branchId?: string | null;
  departmentId?: string | null;
  ipAddress?: string;
  permissions?: string[];
};

/**
 * Determina el scope de visibilidad según los permisos del actor.
 * Si tiene `read-all`, aplica el scope de su rol (branch para GM, depto para DM, global para admin).
 * Si no tiene `read-all`, solo ve sus propias solicitudes.
 */
function buildVacationScope(actor: Actor, query: ListVacationsQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  const hasReadAll = actor.permissions?.includes(VACATION_PERMISSIONS.READ_ALL) ?? false;

  if (!hasReadAll) {
    // Sin read-all: solo ve sus propias solicitudes
    where.employeeId = actor.id;
    return where;
  }

  // Con read-all: aplicar scope según rol
  if (actor.roleName === 'department_manager') {
    // Department manager: base = su departamento, puede filtrar por branch
    where.departmentId = actor.departmentId;
    if (query.branchId) where.branchId = query.branchId;
  } else if (actor.roleName === 'general_manager') {
    // General manager: base = su branch, puede filtrar por departamento
    where.branchId = actor.branchId;
    if (query.departmentId) where.departmentId = query.departmentId;
  }
  // admin: sin filtro base, ve todo (puede filtrar por branchId/departmentId explícitos)

  return where;
}

/**
 * Lista solicitudes de vacaciones según los permisos del actor
 * Con soporte de paginación, ordenación y filtros
 */
export async function listVacations(query: ListVacationsQuery, actor: Actor) {
  const where = buildVacationScope(actor, query);

  // Filtros adicionales del query (se aplican sobre el filtro base del rol)
  if (query.status) where.status = query.status;
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.from || query.to) {
    const dateFilter: Record<string, Date> = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);
    where.startDate = dateFilter;
  }

  const skip = (query.page - 1) * query.pageSize;
  const take = query.pageSize;

  const [items, total] = await Promise.all([
    findVacationRequests(where as any, { sortBy: query.sortBy, sortOrder: query.sortOrder, skip, take }),
    countVacationRequests(where as any),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

/**
 * Obtiene una solicitud por ID con validación de permisos
 */
export async function getVacationById(id: string, actor: Actor) {
  const vacation = await findVacationRequestById(id);
  if (!vacation) {
    throw createAppError('NOT_FOUND', 'Solicitud de vacaciones no encontrada');
  }

  const hasReadAll = actor.permissions?.includes(VACATION_PERMISSIONS.READ_ALL) ?? false;

  if (!hasReadAll) {
    // Sin read-all: solo puede ver sus propias solicitudes
    if (vacation.employeeId !== actor.id) {
      throw createAppError('FORBIDDEN', 'No puedes ver solicitudes de otros empleados');
    }
    return vacation;
  }

  // Con read-all: validar scope según rol
  if (actor.roleName === 'department_manager' && vacation.departmentId !== actor.departmentId) {
    throw createAppError('FORBIDDEN', 'No puedes ver solicitudes de otros departamentos');
  }
  if (actor.roleName === 'general_manager' && vacation.branchId !== actor.branchId) {
    throw createAppError('FORBIDDEN', 'No puedes ver solicitudes de otras sucursales');
  }

  return vacation;
}

/**
 * Crea una solicitud de vacaciones (Employee)
 * Atómica: creación + audit log en una sola transacción
 *
 * Si las fechas solicitadas se solapan con vacaciones de compañeros del mismo departamento,
 * la solicitud se crea con estado 'colindante' en lugar de 'pending'.
 * La respuesta incluye información sobre los compañeros afectados para que el frontend
 * pueda mostrar una advertencia y pedir confirmación.
 */
export async function createVacationEntry(input: CreateVacationRequestInput, actor: Actor) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  // Validaciones de negocio
  ensureStartDateNotPast(startDate);
  ensureValidDateRange(startDate, endDate);

  // Validar que no tenga otra solicitud pending con fechas solapadas
  const pendingOverlap = await countPendingOverlap(actor.id, startDate, endDate);
  if (pendingOverlap > 0) {
    throw createAppError('BAD_REQUEST', 'Ya tienes una solicitud pendiente con fechas solapadas');
  }

  // Obtener branch y department del usuario (obligatorios para crear vacaciones)
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { branchId: true, departmentId: true },
  });

  if (!user?.branchId) {
    throw createAppError('BAD_REQUEST', 'No tienes una sucursal asignada para solicitar vacaciones');
  }
  if (!user?.departmentId) {
    throw createAppError('BAD_REQUEST', 'No tienes un departamento asignado para solicitar vacaciones');
  }

  // Detectar solapamiento con compañeros del mismo departamento
  let overlappingEmployees: Array<{ id: string; name: string; email: string }> = [];
  const overlaps = await findDepartmentOverlap(
    user.departmentId,
    actor.id,
    startDate,
    endDate,
  );
  overlappingEmployees = overlaps.map((o) => ({
    id: o.employee.id,
    name: o.employee.name,
    email: o.employee.email,
  }));

  // Determinar estado: colindante si hay solapamiento, pending si no
  const initialStatus = overlappingEmployees.length > 0 ? 'colindante' : 'pending';

  const vacation = await executeInTransaction(async (tx) => {
    const created = await createVacationRequest({
      employee: { connect: { id: actor.id } },
      startDate,
      endDate,
      note: input.note,
      status: initialStatus as any,
      branch: { connect: { id: user.branchId! } },
      department: { connect: { id: user.departmentId! } },
    }, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'CREATE_VACATION_REQUEST',
      entityType: 'VacationRequest',
      entityId: created.id,
      detailsJson: {
        before: null,
        after: sanitizeSnapshot({
          id: created.id,
          startDate: created.startDate,
          endDate: created.endDate,
          note: created.note,
          status: created.status,
          overlappingEmployees: overlappingEmployees.length > 0 ? overlappingEmployees : undefined,
        }),
      },
      ipAddress: actor.ipAddress,
    }, tx);

    return created;
  });

  // Notificación por webhook (fuera de transacción, no debe causar rollback)
  notifyVacationChange({
    type: 'vacation_requested',
    vacation,
    actor,
  }).catch(() => {});

  // Notificación in-app al empleado
  createInAppNotification({
    userId: actor.id,
    type: 'vacation_requested',
    title: 'Solicitud de vacaciones enviada',
    message: `Has solicitado vacaciones del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}.`,
    link: '/vacations',
    metadata: { vacationId: vacation.id },
  }).catch(() => {});

  // Devolver la solicitud con información de solapamiento
  return {
    ...vacation,
    hasOverlap: overlappingEmployees.length > 0,
    overlappingEmployees,
  };
}

/**
 * Aprueba una solicitud de vacaciones (Manager)
 * Atómica: actualización + audit log en una sola transacción
 */
export async function approveVacationEntry(id: string, input: ApproveVacationInput, actor: Actor) {
  const vacation = await findVacationRequestById(id);
  if (!vacation) {
    throw createAppError('NOT_FOUND', 'Solicitud de vacaciones no encontrada');
  }

  ensureIsPending(vacation.status);
  ensureCanReview(
    actor.roleName,
    actor.branchId,
    actor.departmentId,
    vacation.branchId,
    vacation.departmentId,
  );

  const updated = await executeInTransaction(async (tx) => {
    const result = await updateVacationRequest(id, {
      status: 'approved',
      reviewer: { connect: { id: actor.id } },
      reviewedAt: new Date(),
    }, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'APPROVE_VACATION',
      entityType: 'VacationRequest',
      entityId: id,
      detailsJson: {
        before: sanitizeSnapshot({ status: vacation.status }),
        after: sanitizeSnapshot({ status: 'approved', reviewedBy: actor.id, reviewedAt: new Date().toISOString() }),
        note: input.note,
      },
      ipAddress: actor.ipAddress,
    }, tx);

    return result;
  });

  // Notificación por webhook (fuera de transacción)
  notifyVacationChange({
    type: 'vacation_approved',
    vacation: updated,
    actor,
  }).catch(() => {});

  // Notificación in-app al empleado
  createInAppNotification({
    userId: vacation.employeeId,
    type: 'vacation_approved',
    title: 'Vacaciones aprobadas',
    message: `Tus vacaciones del ${vacation.startDate.toLocaleDateString()} al ${vacation.endDate.toLocaleDateString()} han sido aprobadas por ${actor.name}.`,
    link: '/vacations',
    metadata: { vacationId: id, approvedBy: actor.id },
  }).catch(() => {});

  return updated;
}

/**
 * Rechaza una solicitud de vacaciones (Manager)
 * Atómica: actualización + audit log en una sola transacción
 */
export async function rejectVacationEntry(id: string, input: RejectVacationInput, actor: Actor) {
  const vacation = await findVacationRequestById(id);
  if (!vacation) {
    throw createAppError('NOT_FOUND', 'Solicitud de vacaciones no encontrada');
  }

  ensureIsPending(vacation.status);
  ensureCanReview(
    actor.roleName,
    actor.branchId,
    actor.departmentId,
    vacation.branchId,
    vacation.departmentId,
  );

  const updated = await executeInTransaction(async (tx) => {
    const result = await updateVacationRequest(id, {
      status: 'rejected',
      reviewer: { connect: { id: actor.id } },
      reviewedAt: new Date(),
      rejectionReason: input.rejectionReason,
    }, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'REJECT_VACATION',
      entityType: 'VacationRequest',
      entityId: id,
      detailsJson: {
        before: sanitizeSnapshot({ status: vacation.status }),
        after: sanitizeSnapshot({
          status: 'rejected',
          reviewedBy: actor.id,
          reviewedAt: new Date().toISOString(),
          rejectionReason: input.rejectionReason,
        }),
      },
      ipAddress: actor.ipAddress,
    }, tx);

    return result;
  });

  // Notificación por webhook (fuera de transacción)
  notifyVacationChange({
    type: 'vacation_rejected',
    vacation: updated,
    actor,
  }).catch(() => {});

  // Notificación in-app al empleado
  const rejectionMsg = input.rejectionReason
    ? `Motivo: ${input.rejectionReason}`
    : 'No se especificó motivo.';
  createInAppNotification({
    userId: vacation.employeeId,
    type: 'vacation_rejected',
    title: 'Vacaciones rechazadas',
    message: `Tus vacaciones del ${vacation.startDate.toLocaleDateString()} al ${vacation.endDate.toLocaleDateString()} han sido rechazadas por ${actor.name}. ${rejectionMsg}`,
    link: '/vacations',
    metadata: { vacationId: id, rejectedBy: actor.id, rejectionReason: input.rejectionReason },
  }).catch(() => {});

  return updated;
}

/**
 * Cancela una solicitud de vacaciones
 * - Employee: solo puede cancelar sus propias solicitudes pendientes
 * - Manager/Admin: puede cancelar cualquier solicitud de su scope
 */
export async function cancelVacationEntry(id: string, actor: Actor) {
  const vacation = await findVacationRequestById(id);
  if (!vacation) {
    throw createAppError('NOT_FOUND', 'Solicitud de vacaciones no encontrada');
  }

  const hasCancelAll = actor.permissions?.includes(VACATION_PERMISSIONS.CANCEL) ?? false;

  if (!hasCancelAll) {
    // Sin permiso de cancel: solo puede cancelar sus propias solicitudes
    if (vacation.employeeId !== actor.id) {
      throw createAppError('FORBIDDEN', 'Solo puedes cancelar tus propias solicitudes');
    }
    ensureCanCancel(vacation.status);
  } else {
    // Con permiso de cancel (manager/admin): validar scope
    ensureCanReview(
      actor.roleName,
      actor.branchId,
      actor.departmentId,
      vacation.branchId,
      vacation.departmentId,
    );
    // Puede cancelar en cualquier estado (no solo pending)
  }

  const updated = await executeInTransaction(async (tx) => {
    const result = await updateVacationRequest(id, {
      status: 'cancelled',
    }, tx);

    await logAuditOrThrow({
      userId: actor.id,
      action: 'CANCEL_VACATION',
      entityType: 'VacationRequest',
      entityId: id,
      detailsJson: {
        before: sanitizeSnapshot({ status: vacation.status }),
        after: sanitizeSnapshot({ status: 'cancelled' }),
      },
      ipAddress: actor.ipAddress,
    }, tx);

    return result;
  });

  // Notificación por webhook (fuera de transacción)
  notifyVacationChange({
    type: 'vacation_cancelled',
    vacation: updated,
    actor,
  }).catch(() => {});

  // Notificación in-app al empleado (si quien cancela no es el empleado, notificarle)
  if (vacation.employeeId !== actor.id) {
    createInAppNotification({
      userId: vacation.employeeId,
      type: 'vacation_cancelled',
      title: 'Vacaciones canceladas',
      message: `Tus vacaciones del ${vacation.startDate.toLocaleDateString()} al ${vacation.endDate.toLocaleDateString()} han sido canceladas por ${actor.name}.`,
      link: '/vacations',
      metadata: { vacationId: id, cancelledBy: actor.id },
    }).catch(() => {});
  }

  return updated;
}

/**
 * Obtiene el calendario de vacaciones aprobadas para una semana específica.
 *
 * SCOPE (basado en permisos del actor):
 * - employee / department_manager / general_manager: ve vacaciones de su sede (branchId del actor)
 * - admin: ve todas las sedes
 *
 * FILTROS ADICIONALES (query params):
 * - branchId: solo admin puede filtrar por sede distinta a la suya
 * - departmentId: busca empleados del departamento (incluso en otras sedes vía DepartmentBranch)
 * - employeeId: filtrar por usuario específico
 */
export async function getVacationCalendar(
  year: number | undefined,
  week: number | undefined,
  branchId: string | undefined,
  departmentId: string | undefined,
  employeeId: string | undefined,
  actor?: Actor,
  from?: string,
  to?: string,
) {
  let rangeStart: Date;
  let rangeEnd: Date;

  if (from && to) {
    rangeStart = new Date(from);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(to);
    rangeEnd.setHours(23, 59, 59, 999);
  } else {
    const safeYear = year ?? new Date().getFullYear();
    const safeWeek = week ?? 1;
    const jan4 = new Date(safeYear, 0, 4);
    rangeStart = new Date(jan4);
    rangeStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (safeWeek - 1) * 7);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeStart.getDate() + 6);
    rangeEnd.setHours(23, 59, 59, 999);
  }

  const where: Record<string, unknown> = {
    status: 'approved',
    AND: [
      { startDate: { lte: rangeEnd } },
      { endDate: { gte: rangeStart } },
    ],
  };

  if (actor) {
    const hasReadAll = actor.permissions?.includes(VACATION_PERMISSIONS.READ_ALL) ?? false;

    if (hasReadAll && actor.roleName === 'admin') {
      // Admin: puede filtrar por branchId explícito, o ve todo
      if (branchId) where.branchId = branchId;
    } else {
      // employee, department_manager, general_manager: scope base = su sede
      where.branchId = actor.branchId;

      // Si el actor pidió un branchId explícito y NO es admin, lo ignoramos
      // (no puede ver otras sedes)
    }
  } else {
    // Sin actor (llamada interna/sistema)
    if (branchId) where.branchId = branchId;
  }

  // Filtro por departamento: soporta departamentos multi-sede
  if (departmentId) {
    // Obtener todas las branches donde existe este departamento
    const departmentBranches = await prisma.departmentBranch.findMany({
      where: { departmentId },
      select: { branchId: true },
    });

    if (departmentBranches.length > 0) {
      const branchIds = departmentBranches.map(db => db.branchId);
      // Si ya hay un filtro de branchId, intersectar
      if (where.branchId) {
        const currentBranchId = where.branchId as string;
        if (branchIds.includes(currentBranchId)) {
          // El departamento existe en esta sede, mantener el filtro de branch
          where.departmentId = departmentId;
        } else {
          // El departamento NO existe en esta sede, no mostrar resultados
          where.id = '__none__';
        }
      } else {
        // Sin filtro de branch: mostrar el departamento en todas sus sedes
        where.branchId = { in: branchIds };
        where.departmentId = departmentId;
      }
    } else {
      // Departamento sin branches asociadas (no debería pasar)
      where.departmentId = departmentId;
    }
  }

  // Filtro por empleado específico
  if (employeeId) {
    where.employeeId = employeeId;
  }

  const vacations = await findVacationRequests(where as any);

  const items = vacations.map((v) => ({
    id: v.id,
    employeeId: v.employeeId,
    employeeName: v.employee.name,
    employeeEmail: v.employee.email,
    employeeAvatarUrl: v.employee.avatarUrl,
    employeeDepartment: v.employee.department,
    employeeBranch: v.employee.branch,
    startDate: v.startDate,
    endDate: v.endDate,
    note: v.note,
    branchId: v.branchId,
    departmentId: v.departmentId,
  }));

  return {
    year: year ?? null,
    week: week ?? null,
    weekStart: rangeStart,
    weekEnd: rangeEnd,
    total: items.length,
    items,
  };
}
