import { createAppError } from '../../common/errors/error-catalog';
import { executeInTransaction } from '../../common/transactions/transaction.utils';
import { logAuditOrThrow, sanitizeSnapshot } from '../audit/audit.service';
import { skillsManager } from './skills.manager';
import type { SkillActor } from './skills.types';
import type { CreateSkillInput, ListSkillsQuery, UpdateSkillInput } from './skills.validation';

function normalizeName(name: string) {
  return name.trim();
}

function uniqueSkillIds(skillIds: string[]) {
  return [...new Set(skillIds.map((id) => id.trim()).filter(Boolean))];
}

export class SkillsService {
  /**
   * List skills available for administration and planning filters.
   */
  async listSkills(params: ListSkillsQuery) {
    return skillsManager.listSkills(params);
  }

  /**
   * Create a new skill with a unique normalized name.
   */
  async createSkill(input: CreateSkillInput, actor: SkillActor) {
    const name = normalizeName(input.name);
    const existing = await skillsManager.findByName(name);
    if (existing) throw createAppError('CONFLICT', 'Ya existe una skill con ese nombre');

    return executeInTransaction(async (tx) => {
      const skill = await skillsManager.createSkill({
        name,
        category: input.category?.trim() || null,
        color: input.color ?? '#1d4ed8',
        description: input.description?.trim() || null,
      }, tx);

      await logAuditOrThrow({
        userId: actor.id,
        action: 'CREATE_SKILL',
        entityType: 'Skill',
        entityId: skill.id,
        detailsJson: { before: null, after: sanitizeSnapshot(skill) },
        ipAddress: actor.ipAddress,
      }, tx);

      return skill;
    });
  }

  /**
   * Update a skill while preserving unique names.
   */
  async updateSkill(id: string, input: UpdateSkillInput, actor: SkillActor) {
    const current = await skillsManager.findById(id);
    if (!current) throw createAppError('NOT_FOUND', 'Skill no encontrada');

    const name = input.name ? normalizeName(input.name) : undefined;
    if (name && name !== current.name) {
      const existing = await skillsManager.findByName(name);
      if (existing) throw createAppError('CONFLICT', 'Ya existe una skill con ese nombre');
    }

    return executeInTransaction(async (tx) => {
      const skill = await skillsManager.updateSkill(id, {
        ...(name ? { name } : {}),
        ...(input.category !== undefined ? { category: input.category?.trim() || null } : {}),
        ...(input.color ? { color: input.color } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }, tx);

      await logAuditOrThrow({
        userId: actor.id,
        action: 'UPDATE_SKILL',
        entityType: 'Skill',
        entityId: id,
        detailsJson: { before: sanitizeSnapshot(current), after: sanitizeSnapshot(skill) },
        ipAddress: actor.ipAddress,
      }, tx);

      return skill;
    });
  }

  /**
   * Soft-delete a skill so historical assignments remain auditable.
   */
  async deleteSkill(id: string, actor: SkillActor) {
    return this.updateSkill(id, { isActive: false }, actor);
  }

  /**
   * Replace all skill assignments for a user in a single transaction.
   */
  async assignUserSkills(userId: string, skillIds: string[], actor: SkillActor) {
    const exists = await skillsManager.userExists(userId);
    if (!exists) throw createAppError('NOT_FOUND', 'Usuario no encontrado');

    const uniqueIds = uniqueSkillIds(skillIds);
    const activeCount = await skillsManager.countActiveSkills(uniqueIds);
    if (activeCount !== uniqueIds.length) {
      throw createAppError('BAD_REQUEST', 'Una o varias skills no existen o están inactivas');
    }

    return executeInTransaction(async (tx) => {
      const before = await skillsManager.listUserSkills(userId, tx);
      const after = await skillsManager.replaceUserSkills(userId, uniqueIds, actor.id, tx);

      await logAuditOrThrow({
        userId: actor.id,
        action: 'ASSIGN_USER_SKILLS',
        entityType: 'User',
        entityId: userId,
        detailsJson: { before: sanitizeSnapshot(before), after: sanitizeSnapshot(after) },
        ipAddress: actor.ipAddress,
      }, tx);

      return after;
    });
  }
}

export const skillsService = new SkillsService();
