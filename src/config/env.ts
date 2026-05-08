import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(6000),
    MONGODB_URI: z.string().trim().min(1).default('mongodb://127.0.0.1:27017/mentecart'),
    JWT_SECRET: z.string().trim().min(10),
    JWT_EXPIRES_IN: z.string().trim().min(1).default('24h'),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .optional(),

    CORS_ORIGINS: z.string().trim().default('*'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

    MAX_BOOKINGS_PER_DAY: z.coerce.number().int().positive().default(3),
    CART_ITEM_EXPIRY_MINUTES: z.coerce.number().int().positive().default(15),
    CART_CLEANUP_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),

    PAYHERE_SANDBOX: z.string().optional(),
    PAYHERE_MERCHANT_ID: z.string().optional(),
    PAYHERE_MERCHANT_SECRET: z.string().optional(),
    PAYHERE_NOTIFY_URL: z.string().optional(),
    PAYHERE_RETURN_URL: z.string().optional(),
    PAYHERE_CANCEL_URL: z.string().optional(),
    PAYHERE_CURRENCY: z.string().optional(),
    PAYHERE_CHECKOUT_URL: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const payHereKeys = [
      data.PAYHERE_MERCHANT_ID,
      data.PAYHERE_MERCHANT_SECRET,
      data.PAYHERE_NOTIFY_URL,
      data.PAYHERE_RETURN_URL,
      data.PAYHERE_CANCEL_URL,
    ];

    const configuredCount = payHereKeys.filter((value) => (value || '').trim().length > 0).length;
    if (configuredCount > 0 && configuredCount < payHereKeys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'PayHere env vars must be fully configured together: PAYHERE_MERCHANT_ID, PAYHERE_MERCHANT_SECRET, PAYHERE_NOTIFY_URL, PAYHERE_RETURN_URL, PAYHERE_CANCEL_URL.',
        path: ['PAYHERE_MERCHANT_ID'],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${formatted.join('\n')}`);
}

const defaultLogLevelByEnv: Record<(typeof parsed.data)['NODE_ENV'], string> = {
  development: 'debug',
  test: 'warn',
  production: 'info',
};

const resolvedLogLevel = parsed.data.LOG_LEVEL || defaultLogLevelByEnv[parsed.data.NODE_ENV];

export const env = {
  ...parsed.data,
  LOG_LEVEL: resolvedLogLevel as
    | 'fatal'
    | 'error'
    | 'warn'
    | 'info'
    | 'debug'
    | 'trace'
    | 'silent',
};

export const getCorsOrigins = (): string[] => {
  if (!env.CORS_ORIGINS || env.CORS_ORIGINS === '*') {
    return ['*'];
  }

  return env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};
