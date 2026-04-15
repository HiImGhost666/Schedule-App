
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const schedules = await prisma.schedule.findMany({
        include: {
            assignments: {
                include: {
                    user: true
                }
            }
        }
    });

    console.log('Total schedules:', schedules.length);
    schedules.forEach(s => {
        console.log(`- [${s.id}] ${s.title}: ${s.startDatetime.toISOString()} to ${s.endDatetime.toISOString()} (Type: ${s.type})`);
    });

    const year = 2026;
    const week = 16;
    const jan4 = new Date(year, 0, 4);
    const weekStart = new Date(jan4);
    weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    console.log('\nWeek 16 (2026) Range used by service:');
    console.log('weekStart:', weekStart.toISOString(), `(${weekStart.toString()})`);
    console.log('weekEnd:', weekEnd.toISOString(), `(${weekEnd.toString()})`);

    const filtered = schedules.filter(s =>
        s.startDatetime <= weekEnd && s.endDatetime >= weekStart
    );

    console.log('\nSchedules matching this range in memory:');
    filtered.forEach(s => {
        console.log(`- [${s.id}] ${s.title}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
