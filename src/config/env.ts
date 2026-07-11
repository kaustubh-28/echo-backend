import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid connection string'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  ADMIN_USERNAME: z.string().min(1, 'ADMIN_USERNAME is required'),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  VISITOR_HASH_SALT: z.string().min(1, 'VISITOR_HASH_SALT is required'),
  COOKIE_SIGNING_SECRET: z.string().min(1, 'COOKIE_SIGNING_SECRET is required'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Use console.error directly since the logger relies on this configuration and might not be initialized yet.
  // eslint-disable-next-line no-console
  console.error('Configuration validation failed:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
