import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8), // Reducido para facilitar el desarrollo local
  JWT_REFRESH_SECRET: z.string().min(8),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  PORT: z.string().default('13001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:15173'),
  IMPORT_DEFAULT_PASSWORD: z.string().min(8).default('ChangeMe123!'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@company.com'),
  SEED_ADMIN_PASSWORD: z.string().default('AdminPass123!'),
  SEED_ADMIN_NAME: z.string().default('Administrador Sistema'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
