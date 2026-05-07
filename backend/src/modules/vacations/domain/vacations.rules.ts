import { isBefore, isAfter, startOfDay, isWeekend } from 'date-fns';
import { createAppError } from '../../../common/errors/error-catalog';

/**
 * Valida que la fecha de inicio no sea anterior a hoy
 */
export function ensureStartDateNotPast(startDate: Date): void {
  const today = startOfDay(new Date());
  if (isBefore(startDate, today)) {
    throw createAppError('BAD_REQUEST', 'La fecha de inicio no puede ser anterior a hoy');
  }
}

/**
 * Valida que ambas fechas sean días laborables
 */
export function ensureWeekdays(startDate: Date, endDate: Date): void {
  if (isWeekend(startDate)) {
    throw createAppError('BAD_REQUEST', 'La fecha de inicio debe ser un día laborable (lunes a viernes)');
  }
  if (isWeekend(endDate)) {
    throw createAppError('BAD_REQUEST', 'La fecha de fin debe ser un día laborable (lunes a viernes)');
  }
}

/**
 * Valida que endDate >= startDate
 */
export function ensureValidDateRange(startDate: Date, endDate: Date): void {
  if (isAfter(startDate, endDate)) {
    throw createAppError('BAD_REQUEST', 'La fecha de fin debe ser igual o posterior a la fecha de inicio');
  }
}

/**
 * Valida que el usuario tenga permiso para aprobar/rechazar una solicitud
 * según su rol y relación con la solicitud
 */
export function ensureCanReview(
  actorRole: string,
  actorBranchId: string | null | undefined,
  actorDepartmentId: string | null | undefined,
  requestBranchId: string | null | undefined,
  requestDepartmentId: string | null | undefined,
): void {
  if (actorRole === 'admin') return; // Admin puede todo

  if (actorRole === 'general_manager') {
    if (requestBranchId && actorBranchId && requestBranchId !== actorBranchId) {
      throw createAppError('FORBIDDEN', 'No puedes gestionar vacaciones de otra sucursal');
    }
    return;
  }

  if (actorRole === 'department_manager') {
    if (requestDepartmentId && actorDepartmentId && requestDepartmentId !== actorDepartmentId) {
      throw createAppError('FORBIDDEN', 'No puedes gestionar vacaciones de otro departamento');
    }
    return;
  }

  throw createAppError('FORBIDDEN', 'No tienes permiso para gestionar vacaciones');
}

/**
 * Valida que el empleado pueda cancelar su solicitud (solo si está pending)
 */
export function ensureCanCancel(status: string): void {
  if (status !== 'pending') {
    throw createAppError('BAD_REQUEST', 'Solo puedes cancelar solicitudes pendientes');
  }
}

/**
 * Valida que la solicitud esté en estado pending para aprobar/rechazar
 */
export function ensureIsPending(status: string): void {
  if (status !== 'pending') {
    throw createAppError('BAD_REQUEST', 'La solicitud ya ha sido procesada');
  }
}
