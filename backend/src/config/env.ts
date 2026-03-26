import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("system-design-platform"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  HOST: z.string().min(1).default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  PORT: z.coerce.number().int().positive().default(8080),
});

export type AppConfig = z.infer<typeof envSchema> & {
  corsOrigins: string[];
  hasGeminiCredentials: boolean;
};

let cachedConfig: AppConfig | null = null;

const toOriginList = (rawOrigins: string): string[] =>
  rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const getEnv = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.parse(process.env);

  cachedConfig = {
    ...parsed,
    corsOrigins: toOriginList(parsed.CORS_ORIGIN),
    hasGeminiCredentials: Boolean(parsed.GEMINI_API_KEY ?? parsed.GOOGLE_API_KEY),
  };

  return cachedConfig;
};
