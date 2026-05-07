import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { addDays, startOfWeek, setHours, setMinutes } from 'date-fns';
import { DEPARTMENT_CATALOG } from '../src/config/constants';
import { DEFAULT_THEME } from '../src/modules/settings/theme.presets';
import { createUser } from '../src/modules/users/users.service';
import { env } from '../src/config/env';
import { DEFAULT_ROLE_PERMISSIONS, ROLE_NAMES } from '../src/modules/roles/roles.constants';

// Configuración de Entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

async function databaseHasAnyData() {
  const [userCount, roleCount, branchCount] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.branch.count(),
  ]);
  return userCount > 0 || roleCount > 0 || branchCount > 0;
}

// ============================================================================
// BLOQUE 1: FUNCIONES DE AYUDA (HELPERS)
// ============================================================================

async function ensureSeedUser(input: Parameters<typeof createUser>[0], label: string) {
  try {
    const user = await createUser(input, undefined, { upsertExisting: true });
    console.log(`[USER] ${label} synced: ${input.email}`);
    return user;
  } catch (error) {
    console.error(`[ERROR] Failed to sync user ${label} (${input.email}):`, error);
    throw error;
  }
}

async function ensureSeedSchedule(adminId: string, userId: string, branchId: string, title: string, scheduleTypeId: string, typeValue: string, color: string, isLastMinute: boolean, startAt: Date, endAt: Date) {
  const existing = await prisma.schedule.findFirst({
    where: { title, createdById: adminId, startDatetime: startAt, endDatetime: endAt }
  });

  if (existing) {
    const existingAssignment = await prisma.scheduleAssignment.findUnique({
      where: {
        scheduleId_userId: {
          scheduleId: existing.id,
          userId,
        },
      },
    });

    if (existing.branchId !== branchId || !existingAssignment) {
      const repaired = await prisma.schedule.update({
        where: { id: existing.id },
        data: {
          ...(existing.branchId !== branchId ? { branchId } : {}),
          ...(!existingAssignment ? { assignments: { create: { userId } } } : {}),
        },
      });
      console.log(`[SCHEDULE] Schedule repaired: ${title}`);
      return repaired;
    }

    console.log(`[SCHEDULE] Schedule already exists: ${title}`);
    return existing;
  }

  const schedule = await prisma.schedule.create({
    data: {
      title,
      scheduleTypeId,
      type: typeValue,
      color,
      isLastMinute,
      startDatetime: startAt,
      endDatetime: endAt,
      hoursPerDay: 8,
      createdById: adminId,
      branchId,
      assignments: {
        create: { userId }
      }
    }
  });
  console.log(`[SCHEDULE] Created schedule: ${title} for user ID ${userId}`);
  return schedule;
}

async function ensureSeedDepartment(name: string, code: string, branchIds: string[]) {
  const existing = await prisma.department.findUnique({ where: { code } });

  const department = existing ?? await prisma.department.create({
    data: {
      name,
      code,
      isActive: true,
    },
  });

  if (existing && existing.name !== name) {
    await prisma.department.update({
      where: { id: existing.id },
      data: { name },
    });
  }

  await prisma.departmentBranch.createMany({
    data: branchIds.map((branchId) => ({ departmentId: department.id, branchId })),
    skipDuplicates: true,
  });

  return department;
}

// ============================================================================
// BLOQUE 2: FUNCIÓN PRINCIPAL DE SEEDING
// ============================================================================

async function main() {
  console.log('Obteniendo la Tierra lista. Seeding database...');
  console.log('# -----------------------------------------------------------------------------');
  console.log('# CONFIGURACIÓN DE BASE DE DATOS');
  console.log('# -----------------------------------------------------------------------------');
  console.log('# [CAMBIO PRODUCCIÓN]: Cambia esta URL por la de tu servidor MySQL de producción.');
  console.log('# Si usas el docker-compose.yml incluido, déjalo como está.');
  console.log('----------------------------------------------------');

  const alreadySeeded = await databaseHasAnyData();
  if (alreadySeeded) {
    console.log('La base de datos ya contiene datos. Seed omitido.');
    return;
  }

  // --- BLOQUE 2.1: TEMA GLOBAL ---
  console.log('BLOQUE: TEMAS');
  const existingTheme = await prisma.themeSettings.findUnique({ where: { key: 'global' } });
  if (!existingTheme) {
    await prisma.themeSettings.create({
      data: {
        key: 'global',
        preset: DEFAULT_THEME.preset,
        tokensJson: JSON.stringify(DEFAULT_THEME.tokens),
        overridesJson: JSON.stringify(DEFAULT_THEME.overrides),
      },
    });
    console.log('[THEME] Global theme settings created');
  } else {
    console.log('[THEME] Global theme settings already exist');
  }
  console.log('Seeding database...');

  let mainBranch = await prisma.branch.findUnique({ where: { code: 'TFN' } });
  let secondBranch = await prisma.branch.findUnique({ where: { code: 'GC' } });

  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        name: 'Lãberit Tenerife',
        code: 'TFN',
        city: 'Santa Cruz de Tenerife',
        region: 'Tenerife',
        countryCode: 'ES',
        timezone: 'Atlantic/Canary',
        isActive: true,
      },
    });
  }

  if (!secondBranch) {
    secondBranch = await prisma.branch.create({
      data: {
        name: 'Lãberit Las Palmas',
        code: 'GC',
        city: 'Las Palmas de Gran Canaria',
        region: 'Gran Canaria',
        countryCode: 'ES',
        timezone: 'Atlantic/Canary',
        isActive: true,
      },
    });
  }

  const allBranchIds = [mainBranch.id, secondBranch.id];
  const departments = await Promise.all(
    DEPARTMENT_CATALOG.map((dept) => ensureSeedDepartment(dept.name, dept.code, allBranchIds)),
  );
  const departmentsByCode = new Map(DEPARTMENT_CATALOG.map((dept, index) => [dept.key, departments[index].id]));

  // --- BLOQUE 2.1.1: FERIADOS POR SEDE ---
  console.log('BLOQUE: FERIADOS (Limpieza y Seeding)');

  // Limpieza previa para evitar duplicados y asegurar estado limpio
  await prisma.scheduleAssignment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.branchHoliday.deleteMany();

  const holidays_2026 = [
    // Festivos Nacionales
    { date: new Date(2026, 0, 1), name: 'Año Nuevo', type: 'nacional', scope: 'national', targetRegion: 'all' },
    { date: new Date(2026, 0, 6), name: 'Reyes Magos', type: 'nacional', scope: 'national', targetRegion: 'all' },
    { date: new Date(2026, 3, 3), name: 'Viernes Santo', type: 'nacional', scope: 'national', targetRegion: 'all' },
    { date: new Date(2026, 4, 1), name: 'Día del Trabajo', type: 'nacional', scope: 'national', targetRegion: 'all' },
    { date: new Date(2026, 9, 12), name: 'Fiesta Nacional de España', type: 'nacional', scope: 'national', targetRegion: 'all' },
    { date: new Date(2026, 11, 8), name: 'Inmaculada Concepción', type: 'nacional', scope: 'national', targetRegion: 'all' },
    { date: new Date(2026, 11, 25), name: 'Navidad', type: 'nacional', scope: 'national', targetRegion: 'all' },

    // Festivos Autonómicos – Canarias (asumimos que todas las sedes están en Canarias)
    { date: new Date(2026, 3, 2), name: 'Jueves Santo', type: 'autonomica', scope: 'regional', targetRegion: 'Canarias' },
    { date: new Date(2026, 10, 2), name: 'Todos los Santos (sustitución)', type: 'autonomica', scope: 'regional', targetRegion: 'Canarias' },

    // Mejoras de Convenio
    { date: new Date(2026, 11, 24), name: 'Nochebuena (Mejora Convenio)', type: 'mejora', scope: 'company', targetRegion: 'all' },
    { date: new Date(2026, 11, 31), name: 'Nochevieja (Mejora Convenio)', type: 'mejora', scope: 'company', targetRegion: 'all' },

    // Locales TENERIFE
    { date: new Date(2026, 1, 2), name: 'Virgen de Candelaria', type: 'local', scope: 'local', targetRegion: 'Tenerife' },
    { date: new Date(2026, 1, 17), name: 'Martes de Carnaval', type: 'local', scope: 'local', targetRegion: 'Tenerife' },

    // Locales GRAN CANARIA
    { date: new Date(2026, 1, 17), name: 'Martes de Carnaval', type: 'local', scope: 'local', targetRegion: 'Gran Canaria' },
    { date: new Date(2026, 5, 24), name: 'Día de San Juan', type: 'local', scope: 'local', targetRegion: 'Gran Canaria' },
    { date: new Date(2026, 8, 8), name: 'Patrona de Gran Canaria', type: 'local', scope: 'local', targetRegion: 'Gran Canaria' },
  ];

  const partial_days_2026 = [
    { date: new Date(2026, 0, 5), name: 'Víspera de Reyes (tarde libre)', targetRegion: 'all' },
    { date: new Date(2026, 5, 23), name: 'Víspera de San Juan (tarde libre)', targetRegion: 'Gran Canaria' },
  ];

  const allBranches = [mainBranch, secondBranch].filter((b): b is NonNullable<typeof b> => b !== null);

  for (const h of holidays_2026) {
    for (const b of allBranches) {
      const isApplicable = h.targetRegion === 'all' ||
        h.targetRegion === 'Canarias' ||
        b.region === h.targetRegion;

      if (isApplicable) {
        await prisma.branchHoliday.create({
          data: {
            name: h.name,
            date: h.date,
            type: h.type as any,
            scope: h.scope,
            branchId: b.id,
            isPartial: false
          } as any
        });
      }
    }
  }

  for (const p of partial_days_2026) {
    for (const b of allBranches) {
      const isApplicable = p.targetRegion === 'all' || b.region === p.targetRegion;

      if (isApplicable) {
        await prisma.branchHoliday.create({
          data: {
            name: p.name,
            date: p.date,
            type: 'mejora',
            scope: 'company',
            branchId: b.id,
            isPartial: true
          } as any
        });
      }
    }
  }
  console.log(`[HOLIDAY] ${holidays_2026.length} holidays and ${partial_days_2026.length} partial days seeded.`);

  // --- BLOQUE 2.1.2: ROLES Y PERMISOS ---
  console.log('BLOQUE: ROLES Y PERMISOS');

  const rolesData = ROLE_NAMES.map(name => ({
    name,
    permissions: DEFAULT_ROLE_PERMISSIONS[name]
  }));

  const dbRoles: Record<string, string> = {};
  const allPermissions = new Set(rolesData.flatMap(r => r.permissions));

  for (const perm of allPermissions) {
    await prisma.permission.upsert({
      where: { name: perm },
      create: { name: perm },
      update: {},
    });
  }

  for (const roleDef of rolesData) {
    let role = await prisma.role.findUnique({ where: { name: roleDef.name } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleDef.name,
          permissions: {
            connect: roleDef.permissions.map(name => ({ name }))
          }
        }
      });
      console.log(`[ROLE] Created role ${roleDef.name}`);
    } else {
      // Si ya existe, nos aseguramos de que los permisos estén conectados
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          permissions: {
            connect: roleDef.permissions.map(name => ({ name }))
          }
        }
      });
      console.log(`[ROLE] Role ${roleDef.name} already exists`);
    }
    dbRoles[roleDef.name] = role.id;
  }

  // --- BLOQUE 2.1.3: SCHEDULE TYPES ---
  console.log('BLOQUE: SCHEDULE TYPES');

  const scheduleTypesData = [
    { value: 'guardia', label: 'Guardia', color: '#2563eb' },
    { value: 'ausencia', label: 'Ausencia', color: '#64748b' },
    { value: 'vacaciones', label: 'Vacaciones', color: '#3f6212' },
    { value: 'formacion', label: 'Formación', color: '#0e7490' },
    { value: 'otro', label: 'Otro', color: '#4b5563' },
    { value: 'excepcion', label: 'Excepción', color: '#dc2626' },
  ];

  const scheduleTypesByValue = new Map<string, string>();
  for (const typeData of scheduleTypesData) {
    const synced = await prisma.scheduleType.upsert({
      where: { value: typeData.value },
      create: typeData,
      update: typeData,
    });
    scheduleTypesByValue.set(typeData.value, synced.id);
    console.log(`[SCHEDULE_TYPE] Synced ${typeData.label}`);
  }

  // --- BLOQUE 2.2: USUARIOS ---
  console.log('BLOQUE: USUARIOS');
  const adminEmail = env.SEED_ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const adminName = env.SEED_ADMIN_NAME || 'Administrador Sistema';

  const adminUser = await ensureSeedUser(
    {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      roleId: dbRoles['admin'],
      status: 'active',
      companyPhone: '900200200',
      auxiliaryPhone: '600200200',
      branchId: mainBranch.id,
      departmentId: departmentsByCode.get('administracion'),
    },
    'Admin'
  );

  // Este manager ahora solo podrá gestionar guardias de 'mainBranch' (TFN)
  const managerUser = await ensureSeedUser(
    {
      name: 'María García',
      email: 'manager@company.com',
      password: 'Manager123!',
      roleId: dbRoles['general_manager'],
      status: 'active',
      companyPhone: '900200200',
      auxiliaryPhone: '600200200',
      branchId: mainBranch.id,
      forcePasswordChange: false,
      departmentId: departmentsByCode.get('operaciones'),
    },
    'Demo manager'
  );

  type DepartmentKey = (typeof DEPARTMENT_CATALOG)[number]['key'];
  const demoUsers: Array<{ name: string; email: string; departmentKey: DepartmentKey; branchId: string }> = [
    { name: 'Carlos López', email: 'carlos@company.com', departmentKey: 'seguridad', branchId: mainBranch.id },
    { name: 'Ana Martínez', email: 'ana@company.com', departmentKey: 'seguridad', branchId: mainBranch.id },
    { name: 'Pedro Sánchez', email: 'pedro@company.com', departmentKey: 'mantenimiento', branchId: secondBranch.id },
    { name: 'Laura Fernández', email: 'laura@company.com', departmentKey: 'seguridad', branchId: secondBranch.id },
  ];

  const createdUsers = [];
  for (const u of demoUsers) {
    const user = await ensureSeedUser(
      {
        name: u.name,
        email: u.email,
        branchId: u.branchId,
        password: 'User123!',
        roleId: u.email === 'pedro@company.com' ? dbRoles['department_manager'] : dbRoles['employee'],
        status: 'active',
        forcePasswordChange: true,
        departmentId: departmentsByCode.get(u.departmentKey),
      },
      'Demo user'
    );
    if (user) createdUsers.push(user);
  }

  // --- BLOQUE 2.3: SCHEDULES (GUARDIAS Y VACACIONES) ---
  console.log('BLOQUE: SCHEDULES');
  if (adminUser && createdUsers.length >= 2) {
    // Definimos las fechas a un marco relativo (esta semana)
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });

    const carlosInfo = createdUsers.find(u => u.email === 'carlos@company.com')!;
    const anaInfo = createdUsers.find(u => u.email === 'ana@company.com')!;

    // Carlos: Vacaciones (Toda la semana)
    await ensureSeedSchedule(
      adminUser.id,
      carlosInfo.id,
      mainBranch.id,
      'Vacaciones Carlos',
      scheduleTypesByValue.get('vacaciones')!,
      'vacaciones',
      '#65a30d',
      false,
      monday,
      addDays(monday, 7) // + 7 dias
    );

    // Ana: Guardia Normal
    await ensureSeedSchedule(
      adminUser.id,
      anaInfo.id,
      mainBranch.id,
      'Guardia General',
      scheduleTypesByValue.get('guardia')!,
      'guardia',
      '#2563eb',
      false,
      setHours(setMinutes(addDays(monday, 1), 0), 8), // Martes 8:00
      setHours(setMinutes(addDays(monday, 1), 0), 16) // Martes 16:00
    );

    // Ana: Guardia Extraordinaria
    await ensureSeedSchedule(
      adminUser.id,
      anaInfo.id,
      mainBranch.id,
      'Guardia Extraordinaria',
      scheduleTypesByValue.get('guardia')!,
      'guardia',
      '#db2777',
      true,
      setHours(setMinutes(addDays(monday, 3), 0), 14), // Jueves 14:00
      setHours(setMinutes(addDays(monday, 3), 0), 20) // Jueves 20:00
    );

    // --- BLOQUE 2.4: STRESS TEST (SOLAPAMIENTOS) ---
    console.log('BLOQUE: STRESS TEST (OVERLAPS)');
    const wednesday = addDays(monday, 2);
    const stressStart = setHours(setMinutes(wednesday, 0), 10); // Miércoles 10:00
    const stressEnd = setHours(setMinutes(wednesday, 0), 12);   // Miércoles 12:00

    const stressTasks = [
      { user: adminUser, title: 'Reunión de Dirección', type: 'otro', color: '#4f46e5', branchId: mainBranch.id },
      { user: managerUser, title: 'Formación Seguridad', type: 'formacion', color: '#0891b2', branchId: mainBranch.id },
      { user: createdUsers[0], title: 'Tarea Administrativa', type: 'otro', color: '#4b5563', branchId: createdUsers[0].branchId || mainBranch.id },
      { user: createdUsers[1], title: 'Urgencia Técnica', type: 'otro', color: '#dc2626', branchId: createdUsers[1].branchId || mainBranch.id },
      { user: createdUsers[2], title: 'Mantenimiento Preventivo', type: 'otro', color: '#16a34a', branchId: createdUsers[2].branchId || secondBranch.id },
      { user: createdUsers[3], title: 'Soporte Remoto', type: 'otro', color: '#ea580c', branchId: createdUsers[3].branchId || secondBranch.id },
    ];

    for (const task of stressTasks) {
      if (task.user) {
        await ensureSeedSchedule(
          adminUser.id,
          task.user.id,
          (task as any).branchId,
          task.title,
          scheduleTypesByValue.get(task.type)!,
          task.type,
          task.color,
          false,
          stressStart,
          stressEnd
        );
      }
    }
  } else {
    console.log('[SCHEDULE] Se omitió la creación porque no existen suficientes usuarios base.');
  }

  // ============================================================================
  // BLOQUE 3: RESUMEN FINAL
  // ============================================================================

  console.log('Seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log('Manager login: manager@company.com / Manager123!');
  console.log('User login: carlos@company.com / User123!');
  console.log('----------------------------------------------------');
}

// ============================================================================
// BLOQUE 4: STARTUP SCRIPT
// ============================================================================

main()
  .catch((e) => {
    console.error('!!! SEED ERROR !!!');
    console.error(e);
    if (e instanceof Error) {
      console.error('Stack:', e.stack);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
