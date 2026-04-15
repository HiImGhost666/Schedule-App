import { addHours, isBefore } from 'date-fns';
import { createAppError } from '../../../common/errors/error-catalog';

export function parseOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createAppError('BAD_REQUEST', 'Rango de fechas inválido');
  }
  return parsed;
}

export function buildOverlapRangeFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined;

  if (from && to) {
    if (from > to) {
      throw createAppError('BAD_REQUEST', 'El rango de fechas es inválido: from debe ser menor o igual a to');
    }
    return {
      AND: [
        { startDatetime: { lte: to } },
        { endDatetime: { gte: from } },
      ],
    };
  }

  return {
    ...(from ? { endDatetime: { gte: from } } : {}),
    ...(to ? { startDatetime: { lte: to } } : {}),
  };
}

export function ensureValidScheduleRange(startDatetime: Date, endDatetime: Date) {
  if (isBefore(endDatetime, startDatetime)) {
    throw createAppError('BAD_REQUEST', 'La fecha de fin debe ser posterior a la de inicio');
  }
}

export function isLastMinuteSchedule(startDatetime: Date): boolean {
  return isBefore(startDatetime, addHours(new Date(), 24));
}
