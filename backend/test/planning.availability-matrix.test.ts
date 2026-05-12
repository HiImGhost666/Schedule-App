import { prisma } from '../src/config/database';
import { planningService } from '../src/modules/planning/planning.service';

describe('Planning Availability Matrix', () => {
  let admin: any;
  let branch: any;
  let department: any;
  let employee1: any;
  let employee2: any;

  beforeAll(async () => {
    branch = await prisma.branch.create({
      data: { name: 'Test Branch Matrix', code: 'TMAT' },
    });
    department = await prisma.department.create({
      data: { name: 'Test Dept Matrix', code: 'TDMAT', branches: { create: { branchId: branch.id } } },
    });

    const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
    const employeeRole = await prisma.role.findFirst({ where: { name: 'employee' } });

    if (!adminRole || !employeeRole) {
      throw new Error('Roles not found in database. Ensure roles are seeded.');
    }

    admin = await prisma.user.create({
      data: {
        email: 'admin.matrix@test.com',
        passwordHash: 'hashed',
        name: 'Admin Matrix',
        derivedUsername: 'admin.matrix',
        role: { connect: { id: adminRole.id } },
        branch: { connect: { id: branch.id } },
      },
    });
    employee1 = await prisma.user.create({
      data: {
        email: 'emp1.matrix@test.com',
        passwordHash: 'hashed',
        name: 'Employee One Matrix',
        derivedUsername: 'emp1.matrix',
        role: { connect: { id: employeeRole.id } },
        branch: { connect: { id: branch.id } },
        department: { connect: { id: department.id } },
      },
    });
    employee2 = await prisma.user.create({
      data: {
        email: 'emp2.matrix@test.com',
        passwordHash: 'hashed',
        name: 'Employee Two Matrix',
        derivedUsername: 'emp2.matrix',
        role: { connect: { id: employeeRole.id } },
        branch: { connect: { id: branch.id } },
        department: { connect: { id: department.id } },
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

  it('should return availability matrix for multiple employees across multiple days with correct statuses and schedules', async () => {
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-03T23:59:59Z');

    // Employee 1:
    // June 1: Available
    // June 2: Busy (Shift 1)
    // June 3: Vacation
    const shift1 = await prisma.schedule.create({
      data: {
        title: 'Shift 1 for Emp1',
        startDatetime: new Date('2026-06-02T08:00:00Z'),
        endDatetime: new Date('2026-06-02T16:00:00Z'),
        branchId: branch.id,
        createdBy: admin.id,
        assignments: { create: { userId: employee1.id } },
      },
    });
    await prisma.vacationRequest.create({
      data: {
        employeeId: employee1.id,
        startDate: new Date('2026-06-03T00:00:00Z'),
        endDate: new Date('2026-06-03T23:59:59Z'),
        branchId: branch.id,
        departmentId: department.id,
        status: 'approved',
      },
    });

    // Employee 2:
    // June 1: Busy (Shift 2)
    // June 2: Available
    // June 3: Busy (Shift 3)
    const shift2 = await prisma.schedule.create({
      data: {
        title: 'Shift 2 for Emp2',
        startDatetime: new Date('2026-06-01T10:00:00Z'),
        endDatetime: new Date('2026-06-01T18:00:00Z'),
        branchId: branch.id,
        createdBy: admin.id,
        assignments: { create: { userId: employee2.id } },
      },
    });
    const shift3 = await prisma.schedule.create({
      data: {
        title: 'Shift 3 for Emp2',
        startDatetime: new Date('2026-06-03T09:00:00Z'),
        endDatetime: new Date('2026-06-03T17:00:00Z'),
        branchId: branch.id,
        createdBy: admin.id,
        assignments: { create: { userId: employee2.id } },
      },
    });

    const result = await planningService.getAvailabilityMatrix(
      { from, to, branchId: branch.id },
      { id: admin.id, roleName: 'admin', branchId: branch.id, departmentId: null, permissions: ['schedules:view'] }
    );

    expect(result).toBeDefined();
    expect(result.days).toHaveLength(3);
    expect(result.days[0]).toBe('2026-06-01T00:00:00.000Z');
    expect(result.days[1]).toBe('2026-06-02T00:00:00.000Z');
    expect(result.days[2]).toBe('2026-06-03T00:00:00.000Z');
    expect(result.rows).toHaveLength(2); // employee1 and employee2

    const emp1Result = result.rows.find(r => r.id === employee1.id);
    expect(emp1Result).toBeDefined();
    expect(emp1Result?.name).toBe('Employee One Matrix');
    expect(emp1Result?.days).toHaveLength(3);

    // Employee 1 - June 1: Available
    expect(emp1Result?.days[0].status).toBe('available');
    expect(emp1Result?.days[0].schedules).toHaveLength(0);

    // Employee 1 - June 2: Busy (Shift 1)
    expect(emp1Result?.days[1].status).toBe('busy');
    expect(emp1Result?.days[1].schedules).toHaveLength(1);
    expect(emp1Result?.days[1].schedules[0].id).toBe(shift1.id);
    expect(emp1Result?.days[1].schedules[0].title).toBe(shift1.title);

    // Employee 1 - June 3: Vacation
    expect(emp1Result?.days[2].status).toBe('vacation');
    expect(emp1Result?.days[2].schedules).toHaveLength(0);

    const emp2Result = result.rows.find(r => r.id === employee2.id);
    expect(emp2Result).toBeDefined();
    expect(emp2Result?.name).toBe('Employee Two Matrix');
    expect(emp2Result?.days).toHaveLength(3);

    // Employee 2 - June 1: Busy (Shift 2)
    expect(emp2Result?.days[0].status).toBe('busy');
    expect(emp2Result?.days[0].schedules).toHaveLength(1);
    expect(emp2Result?.days[0].schedules[0].id).toBe(shift2.id);
    expect(emp2Result?.days[0].schedules[0].title).toBe(shift2.title);

    // Employee 2 - June 2: Available
    expect(emp2Result?.days[1].status).toBe('available');
    expect(emp2Result?.days[1].schedules).toHaveLength(0);

    // Employee 2 - June 3: Busy (Shift 3)
    expect(emp2Result?.days[2].status).toBe('busy');
    expect(emp2Result?.days[2].schedules).toHaveLength(1);
    expect(emp2Result?.days[2].schedules[0].id).toBe(shift3.id);
    expect(emp2Result?.days[2].schedules[0].title).toBe(shift3.title);
  });

  it('should filter by department if departmentId is provided', async () => {
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-01T23:59:59Z');

    const otherDepartment = await prisma.department.create({
      data: { name: 'Other Dept Matrix', code: 'ODMAT', branches: { create: { branchId: branch.id } } },
    });
    await prisma.user.create({
      data: {
        email: 'emp3.matrix@test.com',
        passwordHash: 'hashed',
        name: 'Employee Three Matrix',
        derivedUsername: 'emp3.matrix',
        role: { connect: { id: (await prisma.role.findFirst({ where: { name: 'employee' } }))!.id } },
        branch: { connect: { id: branch.id } },
        department: { connect: { id: otherDepartment.id } },
      },
    });

    const result = await planningService.getAvailabilityMatrix(
      { from, to, branchId: branch.id, departmentId: department.id },
      { id: admin.id, roleName: 'admin', branchId: branch.id, departmentId: null, permissions: ['schedules:view'] }
    );

    expect(result.rows).toHaveLength(2); // Only employee1 and employee2 from 'Test Dept Matrix'
    expect(result.rows.some(r => r.id === employee1.id)).toBe(true);
    expect(result.rows.some(r => r.id === employee2.id)).toBe(true);
    expect(result.rows.every(r => r.department?.id === department.id)).toBe(true);
  });

  it('should filter by branch if branchId is provided', async () => {
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-01T23:59:59Z');

    const otherBranch = await prisma.branch.create({
      data: { name: 'Other Branch Matrix', code: 'OBMAT' },
    });
    const otherBranchDepartment = await prisma.department.create({
      data: { name: 'Other Branch Dept Matrix', code: 'OBDMAT', branches: { create: { branchId: otherBranch.id } } },
    });
    await prisma.user.create({
      data: {
        email: 'emp4.matrix@test.com',
        passwordHash: 'hashed',
        name: 'Employee Four Matrix',
        derivedUsername: 'emp4.matrix',
        role: { connect: { id: (await prisma.role.findFirst({ where: { name: 'employee' } }))!.id } },
        branch: { connect: { id: otherBranch.id } },
        department: { connect: { id: otherBranchDepartment.id } },
      },
    });

    const result = await planningService.getAvailabilityMatrix(
      { from, to, branchId: otherBranch.id },
      { id: admin.id, roleName: 'admin', branchId: branch.id, departmentId: null, permissions: ['schedules:view'] }
    );

    expect(result.rows).toHaveLength(1); // Only employee4 from 'Other Branch Matrix'
    expect(result.rows[0].branch?.id).toBe(otherBranch.id);
  });
});