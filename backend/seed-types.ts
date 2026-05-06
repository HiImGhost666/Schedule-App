import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

async function seedScheduleTypes() {
  const scheduleTypesData = [
    { value: 'guardia', label: 'Guardia', color: '#2563eb' },
    { value: 'ausencia', label: 'Ausencia', color: '#64748b' },
    { value: 'vacaciones', label: 'Vacaciones', color: '#3f6212' },
    { value: 'formacion', label: 'Formación', color: '#0e7490' },
    { value: 'otro', label: 'Otro', color: '#4b5563' },
    { value: 'excepcion', label: 'Excepción', color: '#dc2626' },
  ];

  for (const typeData of scheduleTypesData) {
    await prisma.scheduleType.upsert({
      where: { value: typeData.value },
      create: typeData,
      update: typeData,
    });
    console.log(`Synced ${typeData.label}`);
  }

  console.log('Schedule types seeded successfully');
}

seedScheduleTypes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());