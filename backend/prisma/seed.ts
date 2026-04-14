import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { DEFAULT_THEME } from '../src/modules/settings/theme.presets';
import { createUser, UserServiceError } from '../src/modules/users/users.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function ensureSeedUser(input: Parameters<typeof createUser>[0], label: string) {
  try {
    await createUser(input);
    console.log(`${label} created: ${input.email}`);
  } catch (error) {
    if (
      error instanceof UserServiceError &&
      (error.code === 'EMAIL_ALREADY_EXISTS' || error.code === 'USERNAME_ALREADY_EXISTS')
    ) {
      console.log(`${label} already exists: ${input.email}`);
      return;
    }
    throw error;
  }
}

async function main() {
  console.log('Seeding database...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const adminName = process.env.SEED_ADMIN_NAME || 'Administrador Sistema';

  await ensureSeedUser(
    {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'active',
      department: 'Administración',
      islandCalendar: 'none',
    },
    'Admin'
  );

  // Create demo manager
  await ensureSeedUser(
    {
      name: 'María García',
      email: 'manager@company.com',
      password: 'Manager123!',
      role: 'manager',
      status: 'active',
      department: 'Operaciones',
      islandCalendar: 'none',
    },
    'Demo manager'
  );

  // Create demo users
  const demoUsers = [
    { name: 'Carlos López', email: 'carlos@company.com', department: 'Seguridad' },
    { name: 'Ana Martínez', email: 'ana@company.com', department: 'Seguridad' },
    { name: 'Pedro Sánchez', email: 'pedro@company.com', department: 'Mantenimiento' },
    { name: 'Laura Fernández', email: 'laura@company.com', department: 'Seguridad' },
  ];

  for (const u of demoUsers) {
    await ensureSeedUser(
      {
        ...u,
        password: 'User123!',
        role: 'viewer',
        status: 'active',
        islandCalendar: 'none',
      },
      'Demo user'
    );
  }

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
    console.log('Global theme settings created');
  }

  console.log('Seed completed successfully!');
  console.log('---');
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log('Manager login: manager@company.com / Manager123!');
  console.log('User login: carlos@company.com / User123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
