import type { Skill, UserSkill } from '@prisma/client';

export type SkillActor = {
  id: string;
  ipAddress?: string;
};

export type SkillResponse = Skill;

export type AssignedUserSkill = UserSkill & {
  skill: Skill;
};
