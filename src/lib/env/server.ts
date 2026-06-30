import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("Axe CRM"),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DEAL_EVENTS_WEBHOOK_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  INTEGRATION_ENCRYPTION_KEY: z.string().min(32).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = serverEnvSchema.parse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    DEAL_EVENTS_WEBHOOK_URL: process.env.DEAL_EVENTS_WEBHOOK_URL,
    APP_URL: process.env.APP_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    INTEGRATION_ENCRYPTION_KEY: process.env.INTEGRATION_ENCRYPTION_KEY,
  });

  return cachedEnv;
}

export function hasDatabaseConfig(env = getServerEnv()) {
  return Boolean(env.DATABASE_URL && env.DIRECT_URL);
}
