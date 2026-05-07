import * as repo from './roles.repository';
import { CreateRoleSchema, UpdateRoleSchema } from './roles.http.schemas';
import { z } from 'zod';

export async function listRoles() {
  return repo.findRoles();
}

export async function getRole(id: string) {
  const role = await repo.findRoleById(id);
  if (!role) throw new Error('Role no encontrado');
  return role;
}

export async function createRole(payload: z.infer<typeof CreateRoleSchema>) {
  const data = CreateRoleSchema.parse(payload);
  return repo.createRole(data);
}

export async function updateRole(id: string, payload: z.infer<typeof UpdateRoleSchema>) {
  const data = UpdateRoleSchema.parse(payload);
  const role = await repo.findRoleById(id);
  if (!role) throw new Error('Role no encontrado');
  if (role.isSystem && data.name && data.name !== role.name) {
     throw new Error('No se puede cambiar el nombre de un rol de sistema');
  }
  return repo.updateRole(id, data);
}

export async function deleteRole(id: string) {
  const role = await repo.findRoleById(id);
  if (!role) throw new Error('Role no encontrado');
  if (role.isSystem) {
    throw new Error('No se pueden borrar roles de sistema');
  }
  return repo.deleteRole(id);
}

export async function listPermissions() {
  return repo.getPermissions();
}
