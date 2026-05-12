import { prisma } from '../src/config/database';
import { planningService } from '../src/modules/planning/planning.service';

describe('Planning Availability', () => {
  let admin: any;
  let branch: any;
  let department: any;
  let employee: any;

  beforeAll(async () => {
    branch = await prisma.branch.create({
      data: { name: 'Test Branch', code: 'TAVAIL' },
    });
    department = await prisma.department.create({
      data: { name: 'Test Dept', code: 'TDEPT', branches: { create: { branchId: branch.id } } },
    });

    const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
    const employeeRole = await prisma.role.findFirst({ where: { name: 'employee' } });

    if (!adminRole || !employeeRole) {
      throw new Error('Roles not found in database. Ensure roles are seeded.');
    }

    admin = await prisma.user.create({
      data: {
        email: 'admin.avail@test.com',
        passwordHash: 'hashed',
        // Usar 'name' en lugar de 'firstName' y 'lastName' para la creación de usuarios
        name: 'Admin Planning',
        derivedUsername: 'admin.avail', // Añadir campo requerido
        role: { connect: { id: adminRole.id } },
        branchId: branch.id,
      },
    });
    employee = await prisma.user.create({
      data: {
        email: 'emp.avail@test.com',
        passwordHash: 'hashed',
        // Usar 'name' en lugar de 'firstName' y 'lastName' para la creación de usuarios
        name: 'Employee One',
        derivedUsername: 'emp.avail', // Añadir campo requerido
        role: { connect: { id: employeeRole.id } },
        branchId: branch.id,
        departmentId: department.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.scheduleAssignment.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.vacationRequest.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    await prisma.branch.deleteMany();
  });

  it('should return availability status for an employee across multiple days', async () => {
    const from = new Date('2026-05-10T00:00:00Z');
    const to = new Date('2026-05-12T23:59:59Z');

    // 11 de Mayo: Ocupado (Turno asignado)
    await prisma.schedule.create({
      data: {
        title: 'Busy Shift',
        startDatetime: new Date('2026-05-11T08:00:00Z'),
        endDatetime: new Date('2026-05-11T16:00:00Z'),
        branchId: branch.id,
        createdBy: admin.id,
        assignments: { create: { userId: employee.id } },
      },
    });

    // 12 de Mayo: Vacaciones (Aprobadas)
    await prisma.vacationRequest.create({
      data: {
        employeeId: employee.id,
        startDate: new Date('2026-05-12T00:00:00Z'),
        endDate: new Date('2026-05-12T23:59:59Z'),
        branchId: branch.id, // Añadir branchId
        departmentId: department.id, // Añadir departmentId
        status: 'approved',
      },
    });

    const result = await planningService.getAvailability(
      { from, to, branchId: branch.id },
      { id: admin.id, roleName: 'admin', branchId: branch.id, departmentId: null, permissions: ['schedules:view'] }
    );

    const empResult = result.find((r: any) => r.userId === employee.id);
    expect(empResult).toBeDefined();
    expect(empResult?.days).toHaveLength(3);

    // 10 Mayo: Disponible
    expect(empResult?.days[0].status).toBe('available');
    // 11 Mayo: Ocupado
    expect(empResult?.days[1].status).toBe('busy');
    // 12 Mayo: Vacaciones
    expect(empResult?.days[2].status).toBe('vacation');
  });
});