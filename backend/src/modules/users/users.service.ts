import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/bcrypt';
import { z } from 'zod';

const createUserInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
  department: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  islandCalendar: z.enum(['tenerife', 'las_palmas', 'none']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export class UserServiceError extends Error {
  constructor(
    public readonly code: 'INVALID_USER_INPUT' | 'EMAIL_ALREADY_EXISTS' | 'USERNAME_ALREADY_EXISTS',
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  department: true,
  avatarUrl: true,
  createdAt: true,
  islandCalendar: true,
} as const;

export type SafeUser = Awaited<ReturnType<typeof createUser>>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function extractUsernameFromEmail(email: string): string {
  return email.split('@')[0];
}

function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export async function createUser(input: CreateUserInput, _actor?: { id: string }) {
  const parsed = createUserInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new UserServiceError('INVALID_USER_INPUT', 'Datos inválidos', 400, parsed.error.flatten());
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const username = extractUsernameFromEmail(normalizedEmail);

  const existingUser = await prisma.user.findFirst({
    where: {
      NOT: { email: { startsWith: 'deleted_' } },
      OR: [
        { email: normalizedEmail },
        { email: { startsWith: `${username}@` } },
      ],
    },
    select: { email: true },
  });

  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw new UserServiceError('EMAIL_ALREADY_EXISTS', 'El email ya está registrado', 409);
    }
    throw new UserServiceError('USERNAME_ALREADY_EXISTS', 'El username ya está registrado', 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const { password: _password, ...userData } = parsed.data;

  return prisma.user.create({
    data: {
      ...userData,
      email: normalizedEmail,
      passwordHash,
      role: parsed.data.role ?? 'viewer',
      status: parsed.data.status ?? 'active',
      islandCalendar: parsed.data.islandCalendar ?? 'none',
    },
    select: USER_SAFE_SELECT,
  });
}

export async function findUserByEmailOrUsername(identifier: string) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (!normalizedIdentifier) return null;

  const where = normalizedIdentifier.includes('@')
    ? { email: normalizedIdentifier }
    : { email: { startsWith: `${normalizedIdentifier}@` } };

  return prisma.user.findFirst({
    where: {
      ...where,
      NOT: { email: { startsWith: 'deleted_' } },
    },
  });
}
