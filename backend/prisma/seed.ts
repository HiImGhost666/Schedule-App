import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { addDays, startOfWeek, setHours, setMinutes } from 'date-fns';
import { DEFAULT_THEME } from '../src/modules/settings/theme.presets';
import { createUser } from '../src/modules/users/users.service';
import { isAppError } from '../src/common/errors/app-error';

// Configuración de Entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const prisma = new PrismaClient();

// ============================================================================
// BLOQUE 1: FUNCIONES DE AYUDA (HELPERS)
// ============================================================================

async function ensureSeedUser(input: Parameters<typeof createUser>[0], label: string) {
  try {
    const user = await createUser(input);
    console.log(`[USER] ${label} created: ${input.email}`);
    return user;
  } catch (error) {
    if (isAppError(error) && error.code === 'CONFLICT') {
      console.log(`[USER] ${label} already exists: ${input.email}`);
      return prisma.user.findUnique({ where: { email: input.email } });
    }
    throw error;
  }
}

async function ensureSeedSchedule(adminId: string, userId: string, title: string, type: string, color: string, isLastMinute: boolean, startAt: Date, endAt: Date) {
  const existing = await prisma.schedule.findFirst({
    where: { title, createdById: adminId, startDatetime: startAt, endDatetime: endAt }
  });

  if (existing) {
    console.log(`[SCHEDULE] Schedule already exists: ${title}`);
    return existing;
  }

  const schedule = await prisma.schedule.create({
    data: {
      title,
      type,
      color,
      isLastMinute,
      startDatetime: startAt,
      endDatetime: endAt,
      hoursPerDay: 8,
      calendarType: 'tenerife',
      createdById: adminId,
      assignments: {
        create: { userId }
      }
    }
  });
  console.log(`[SCHEDULE] Created schedule: ${title} for user ID ${userId}`);
  return schedule;
}

// ============================================================================
// BLOQUE 2: FUNCIÓN PRINCIPAL DE SEEDING
// ============================================================================

async function main() {
  console.log('Obteniendo la Tierra lista. Seeding database...');
  console.log('----------------------------------------------------');

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

  // --- BLOQUE 2.2: USUARIOS ---
  console.log('BLOQUE: USUARIOS');
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const adminName = process.env.SEED_ADMIN_NAME || 'Administrador Sistema';

  const adminUser = await ensureSeedUser(
    {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'active',
      department: 'Administración',
      islandCalendar: 'none',
      companyPhone: '900200200',
      auxiliaryPhone: '600200200',
    },
    'Admin'
  );

  const managerUser = await ensureSeedUser(
    {
      name: 'María García',
      email: 'manager@company.com',
      password: 'Manager123!',
      role: 'manager',
      status: 'active',
      department: 'Operaciones',
      islandCalendar: 'none',
      companyPhone: '900200200',
      auxiliaryPhone: '600200200',
    },
    'Demo manager'
  );

  const demoUsers = [
    { name: 'Carlos López', email: 'carlos@company.com', department: 'Seguridad', companyPhone: '123456789', auxiliaryPhone: '987654321' },
    { name: 'Ana Martínez', email: 'ana@company.com', department: 'Seguridad', companyPhone: '223456789', auxiliaryPhone: '887654321' },
    { name: 'Pedro Sánchez', email: 'pedro@company.com', department: 'Mantenimiento', companyPhone: '323456789' },
    { name: 'Laura Fernández', email: 'laura@company.com', department: 'Seguridad', companyPhone: '423456789' },
  ];

  const createdViewers = [];
  for (const u of demoUsers) {
    const user = await ensureSeedUser(
      {
        ...u,
        password: 'User123!',
        role: 'viewer',
        status: 'active',
        islandCalendar: 'none',
      },
      'Demo user'
    );
    if (user) createdViewers.push(user);
  }

  // --- BLOQUE 2.3: SCHEDULES (GUARDIAS Y VACACIONES) ---
  console.log('BLOQUE: SCHEDULES');
  if (adminUser && createdViewers.length >= 2) {
    // Definimos las fechas a un marco relativo (esta semana)
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });

    const carlosInfo = createdViewers.find(u => u.email === 'carlos@company.com')!;
    const anaInfo = createdViewers.find(u => u.email === 'ana@company.com')!;

    // Carlos: Vacaciones (Toda la semana)
    await ensureSeedSchedule(
      adminUser.id,
      carlosInfo.id,
      'Vacaciones Carlos',
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
      'Guardia General',
      'guardia',
      '#2563eb',
      false,
      setHours(setMinutes(addDays(monday, 1), 0), 8), // Martes 8:00
      setHours(setMinutes(addDays(monday, 1), 0), 16) // Martes 16:00
    );

    // Ana: Guardia Extra de última hora
    await ensureSeedSchedule(
      adminUser.id,
      anaInfo.id,
      'Guardia Extraordinaria',
      'guardia_extra',
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
      { user: adminUser, title: 'Reunión de Dirección', type: 'reunion', color: '#4f46e5' },
      { user: managerUser, title: 'Formación Seguridad', type: 'formacion', color: '#0891b2' },
      { user: createdViewers[0], title: 'Tarea Administrativa', type: 'administrativo', color: '#4b5563' },
      { user: createdViewers[1], title: 'Urgencia Técnica', type: 'urgencia', color: '#dc2626' },
      { user: createdViewers[2], title: 'Mantenimiento Preventivo', type: 'mantenimiento', color: '#16a34a' },
      { user: createdViewers[3], title: 'Soporte Remoto', type: 'soporte', color: '#ea580c' },
    ];

    for (const task of stressTasks) {
      if (task.user) {
        await ensureSeedSchedule(
          adminUser.id,
          task.user.id,
          task.title,
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
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
