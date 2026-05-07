import { z } from 'zod';
import { PERMISSIONS } from './roles.constants';

export const RolePermissionSchema = z.enum(PERMISSIONS);

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional().nullable(),
  permissions: z.array(RolePermissionSchema).optional(),
});

export const UpdateRoleSchema = CreateRoleSchema.partial();
