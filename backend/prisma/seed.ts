import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { DEFAULT_THEME } from '../src/modules/settings/theme.presets';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const adminName = process.env.SEED_ADMIN_NAME || 'Administrador Sistema';

  // Create/Update admin user
  const adminData = {
    name: adminName,
    email: adminEmail,
    role: 'admin',
    status: 'active',
    department: 'Administración',
    companyPhone: '900100100',
    auxiliaryPhone: '600100100',
  };

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: { ...adminData, passwordHash },
    });
    console.log(`Admin created: ${adminEmail}`);
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: adminData,
    });
    console.log(`Admin updated: ${adminEmail}`);
  }

  // Create/Update demo manager
  const managerEmail = 'manager@company.com';
  const managerData = {
    name: 'María García',
    email: managerEmail,
    role: 'manager',
    status: 'active',
    department: 'Operaciones',
    companyPhone: '900200200',
    auxiliaryPhone: '600200200',
  };

  const existingManager = await prisma.user.findUnique({ where: { email: managerEmail } });
  if (!existingManager) {
    const passwordHash = await bcrypt.hash('Manager123!', 12);
    await prisma.user.create({
      data: { ...managerData, passwordHash },
    });
    console.log('Demo manager created');
  } else {
    await prisma.user.update({
      where: { email: managerEmail },
      data: managerData,
    });
    console.log('Demo manager updated');
  }

  // Create demo users
  const demoUsers = [
    { name: 'Carlos López', email: 'carlos@company.com', department: 'Seguridad', companyPhone: '123456789', auxiliaryPhone: '987654321' },
    { name: 'Ana Martínez', email: 'ana@company.com', department: 'Seguridad', companyPhone: '223456789', auxiliaryPhone: '887654321' },
    { name: 'Pedro Sánchez', email: 'pedro@company.com', department: 'Mantenimiento', companyPhone: '323456789' },
    { name: 'Laura Fernández', email: 'laura@company.com', department: 'Seguridad', companyPhone: '423456789' },
  ];

  for (const u of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash('User123!', 12);
      await prisma.user.create({
        data: { ...u, passwordHash, role: 'viewer', status: 'active' },
      });
      console.log(`Demo user created: ${u.email}`);
    } else {
      await prisma.user.update({
        where: { email: u.email },
        data: u,
      });
      console.log(`Demo user updated: ${u.email}`);
    }
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
