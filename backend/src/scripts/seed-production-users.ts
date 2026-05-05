/**
 * Script para crear los usuarios reales de producción.
 * Uso: npx ts-node src/scripts/seed-production-users.ts
 *
 * Los usuarios se crean con forcePasswordChange=true (excepto el admin).
 * En el primer login se les pedirá que cambien la contraseña.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

function getDerivedUsername(email: string) {
  return email.trim().toLowerCase().split('@')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Usuarios de producción
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTION_USERS = [
  // ── ADMINISTRADORES ──
  {
    name: 'Alan Guillén Perera',
    email: 'aguillen@laberit.com',
    role: 'admin',
    department: 'Administración',
    initialPassword: 'Laberit@Admin2025!',
    forcePasswordChange: true,
  },

  // ── RESPONSABLES ──
  {
    name: 'Adán Luis Senen Mora',
    email: 'asenen@laberit.com',
    role: 'general_manager',
    department: 'Operaciones',
    initialPassword: 'Lb@AS2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Eduardo Guerra Ortiz',
    email: 'eguerra@laberit.com',
    role: 'general_manager',
    department: 'Operaciones',
    initialPassword: 'Lb@EG2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Juan José Robaina Quintana',
    email: 'jrobaina@laberit.com',
    role: 'general_manager',
    department: 'Operaciones',
    initialPassword: 'Lb@JR2025!',
    forcePasswordChange: true,
  },

  // ── USUARIOS ──
  {
    name: 'Antonio Fernández López',
    email: 'afernandez@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@AF2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Eduardo Estevez Lemes',
    email: 'eestevez@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@EE2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Esther María Hernández Moreno',
    email: 'ehernandezm@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@EHM2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Fidel Cristo Cruz Pérez',
    email: 'fcruz@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@FC2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Francisco Javier González Pérez',
    email: 'fjgonzalez@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@FJG2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Héctor Neftalí Mesa Betancor',
    email: 'hmesa@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@HM2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Óscar José Cabrera Junquera',
    email: 'ocabrera@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@OC2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Zakaria Ait Atto',
    email: 'zait@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@ZA2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Carlos Cruz González',
    email: 'ccruz@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@CC2025!',
    forcePasswordChange: true,
  },
  {
    name: 'Fernando Javier Reges Freyre',
    email: 'freges@laberit.com',
    role: 'employee',
    department: 'Seguridad',
    initialPassword: 'Lb@FR2025!',
    forcePasswordChange: true,
  },
];

async function main() {
  console.log('\n========================================');
  console.log('  SEED: Usuarios de Producción — Lãberit');
  console.log('========================================\n');

  const created: string[] = [];
  const skipped: string[] = [];
  const dbRoles = await prisma.role.findMany({ select: { id: true, name: true } });

  for (const u of PRODUCTION_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      console.log(`  ⏭  Ya existe:  ${u.email}`);
      skipped.push(u.email);
      continue;
    }

    const passwordHash = await bcrypt.hash(u.initialPassword, 12);
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        derivedUsername: getDerivedUsername(u.email),
        passwordHash,
        roleId: dbRoles.find(r => r.name === u.role)?.id || null,
        status: 'active',
        department: u.department,
        forcePasswordChange: u.forcePasswordChange,
      },
    });

    console.log(`  ✅  Creado:     ${u.email}  [${u.role}]`);
    created.push(u.email);
  }

  console.log('\n========================================');
  console.log(`  Creados: ${created.length}  |  Ya existían: ${skipped.length}`);
  console.log('========================================\n');

  if (created.length > 0) {
    console.log('CONTRASEÑAS INICIALES (comunicar a cada usuario por canal seguro):');
    console.log('─'.repeat(62));
    for (const u of PRODUCTION_USERS) {
      if (created.includes(u.email)) {
        const marker = u.forcePasswordChange ? '[cambio obligatorio en 1er login]' : '[admin]';
        console.log(`  ${u.email.padEnd(32)} ${u.initialPassword.padEnd(20)} ${marker}`);
      }
    }
    console.log('─'.repeat(62));
    console.log('\n⚠️  Guarda esta información en un lugar seguro y elimínala después.\n');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
