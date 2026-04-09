import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const adminName = process.env.SEED_ADMIN_NAME || 'Administrador Sistema';

  // Create admin user
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'admin',
        status: 'active',
        department: 'Administración',
      },
    });
    console.log(`Admin created: ${adminEmail}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  // Create demo manager
  const managerEmail = 'manager@company.com';
  const existingManager = await prisma.user.findUnique({ where: { email: managerEmail } });
  if (!existingManager) {
    const passwordHash = await bcrypt.hash('Manager123!', 12);
    await prisma.user.create({
      data: {
        name: 'María García',
        email: managerEmail,
        passwordHash,
        role: 'manager',
        status: 'active',
        department: 'Operaciones',
      },
    });
    console.log('Demo manager created');
  }

  // Create demo users
  const demoUsers = [
    { name: 'Carlos López', email: 'carlos@company.com', department: 'Seguridad' },
    { name: 'Ana Martínez', email: 'ana@company.com', department: 'Seguridad' },
    { name: 'Pedro Sánchez', email: 'pedro@company.com', department: 'Mantenimiento' },
    { name: 'Laura Fernández', email: 'laura@company.com', department: 'Seguridad' },
  ];

  for (const u of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash('User123!', 12);
      await prisma.user.create({
        data: { ...u, passwordHash, role: 'viewer', status: 'active' },
      });
      console.log(`Demo user created: ${u.email}`);
    }
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
