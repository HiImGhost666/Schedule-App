import { prisma } from '../../config/database';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import type { CreateShiftPresetInput, UpdateShiftPresetInput } from './shift-presets.http.schemas';

export async function listShiftPresets() {
  return prisma.shiftPreset.findMany({ orderBy: { name: 'asc' } });
}

export async function getShiftPresetById(id: string) {
  return prisma.shiftPreset.findUnique({ where: { id } });
}

export async function createShiftPreset(data: CreateShiftPresetInput, actorId: string) {
  return executeInTransaction(async (tx) => {
    const preset = await tx.shiftPreset.create({ data });
    await logAuditOrThrow({
      userId: actorId,
      action: 'CREATE_SHIFT_PRESET',
      entityType: 'ShiftPreset',
      entityId: preset.id,
      detailsJson: { before: null, after: sanitizeSnapshot(preset) },
    }, tx);
    return preset;
  });
}

export async function updateShiftPreset(id: string, data: UpdateShiftPresetInput, actorId: string) {
  return executeInTransaction(async (tx) => {
    const before = await tx.shiftPreset.findUnique({ where: { id } });
    const preset = await tx.shiftPreset.update({ where: { id }, data });
    await logAuditOrThrow({
      userId: actorId,
      action: 'UPDATE_SHIFT_PRESET',
      entityType: 'ShiftPreset',
      entityId: id,
      detailsJson: { before: sanitizeSnapshot(before), after: sanitizeSnapshot(preset) },
    }, tx);
    return preset;
  });
}

export async function deleteShiftPreset(id: string, actorId: string) {
  return executeInTransaction(async (tx) => {
    const preset = await tx.shiftPreset.delete({ where: { id } });
    await logAuditOrThrow({
      userId: actorId,
      action: 'DELETE_SHIFT_PRESET',
      entityType: 'ShiftPreset',
      entityId: id,
      detailsJson: { before: sanitizeSnapshot(preset), after: null },
    }, tx);
    return preset;
  });
}
