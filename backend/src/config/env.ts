import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("system-design-platform"),
  AUTH0_AUDIENCE: z.string().min(1).optional(),
  AUTH0_DOMAIN: z.string().min(1).optional(),
  AUTH0_REQUIRED_SCOPE: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  HOST: z.string().min(1).default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  PORT: z.coerce.number().int().positive().default(8080),
});

export type AppConfig = z.infer<typeof envSchema> & {
  auth0: {
    audience: string | null;
    domain: string | null;
    isEnabled: boolean;
    issuerBaseUrl: string | null;
    requiredScopes: string[];
  };
  corsOrigins: string[];
  hasGeminiCredentials: boolean;
};

let cachedConfig: AppConfig | null = null;

const toOriginList = (rawOrigins: string): string[] =>
  rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const normalizeIssuerBaseUrl = (domain: string | undefined): string | null => {
  const trimmedDomain = domain?.trim();

  if (!trimmedDomain) {
    return null;
  }

  const withProtocol = trimmedDomain.startsWith("http")
    ? trimmedDomain
    : `https://${trimmedDomain}`;

  return withProtocol.replace(/\/+$/, "");
};

const parseScopeList = (rawScopes: string | undefined): string[] =>
  rawScopes
    ?.split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean) ?? [];

export const getEnv = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.parse(process.env);
  const issuerBaseUrl = normalizeIssuerBaseUrl(parsed.AUTH0_DOMAIN);
  const authAudience = parsed.AUTH0_AUDIENCE?.trim() ?? null;
  const authDomain = parsed.AUTH0_DOMAIN?.trim() ?? null;
  const requiredScopes = parseScopeList(parsed.AUTH0_REQUIRED_SCOPE);

  cachedConfig = {
    ...parsed,
    auth0: {
      audience: authAudience,
      domain: authDomain,
      isEnabled: Boolean(issuerBaseUrl && authAudience),
      issuerBaseUrl,
      requiredScopes,
    },
    corsOrigins: toOriginList(parsed.CORS_ORIGIN),
    hasGeminiCredentials: Boolean(
      parsed.GEMINI_API_KEY ?? parsed.GOOGLE_API_KEY,
    ),
  };

  return cachedConfig;
};
