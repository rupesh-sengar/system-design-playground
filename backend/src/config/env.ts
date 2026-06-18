import { z } from "zod";

const envSchema = z.object({
  AI_VALIDATION_PROVIDER: z
    .enum(["deepseek", "rule-engine"])
    .default("deepseek"),
  APP_NAME: z.string().min(1).default("system-design-platform"),
  AUTH0_AUDIENCE: z.string().min(1).optional(),
  AUTH0_DOMAIN: z.string().min(1).optional(),
  AUTH0_REQUIRED_SCOPE: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1).optional(),
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  DEEPSEEK_BASE_URL: z.string().min(1).default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-v4-flash"),
  DEEPSEEK_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(120_000),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  EMBEDDING_PROVIDER: z.literal("ollama").default("ollama"),
  FRONTEND_BASE_URL: z.string().min(1).default("http://localhost:5173"),
  HOST: z.string().min(1).default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  MONTHLY_AI_FREE_QUOTA: z.coerce.number().int().nonnegative().default(10),
  MONTHLY_AI_PLUS_QUOTA: z.coerce.number().int().nonnegative().default(200),
  MONTHLY_AI_PRO_QUOTA: z.coerce.number().int().nonnegative().default(600),
  OLLAMA_BASE_URL: z.string().min(1).default("http://localhost:11434"),
  OLLAMA_EMBEDDING_MODEL: z.string().min(1).default("nomic-embed-text"),
  OLLAMA_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(120_000),
  PORT: z.coerce.number().int().positive().default(8080),
  RAZORPAY_API_BASE_URL: z.string().min(1).default("https://api.razorpay.com"),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_PLAN_PLUS_MONTHLY: z.string().min(1).optional(),
  RAZORPAY_PLAN_PLUS_YEARLY: z.string().min(1).optional(),
  RAZORPAY_PLAN_PRO_MONTHLY: z.string().min(1).optional(),
  RAZORPAY_PLAN_PRO_YEARLY: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof envSchema> & {
  ai: {
    validationProvider: "deepseek" | "rule-engine";
  };
  auth0: {
    audience: string | null;
    domain: string | null;
    isEnabled: boolean;
    issuerBaseUrl: string | null;
    requiredScopes: string[];
  };
  corsOrigins: string[];
  deepseek: {
    apiKey: string | null;
    baseUrl: string;
    model: string;
    requestTimeoutMs: number;
  };
  frontendBaseUrl: string;
  hasDeepSeekCredentials: boolean;
  embeddings: {
    dimensions: number;
    model: string;
    provider: "ollama";
  };
  ollama: {
    baseUrl: string;
    embeddingModel: string;
    requestTimeoutMs: number;
  };
  postgres: {
    connectionString: string | null;
    isEnabled: boolean;
  };
  razorpay: {
    apiBaseUrl: string;
    isCheckoutEnabled: boolean;
    isWebhookEnabled: boolean;
    keyId: string | null;
    keySecret: string | null;
    planIds: {
      plusMonthly: string | null;
      plusYearly: string | null;
      proMonthly: string | null;
      proYearly: string | null;
    };
    webhookSecret: string | null;
  };
  usageQuotas: {
    monthlyAi: {
      free: number;
      plus: number;
      pro: number;
    };
  };
};

let cachedConfig: AppConfig | null = null;

const toOriginList = (rawOrigins: string | undefined): string[] =>
  rawOrigins
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const resolveCorsOrigins = (rawOrigins: {
  CORS_ORIGIN: string;
  CORS_ORIGINS?: string | undefined;
}): string[] => {
  const corsOrigins = toOriginList(rawOrigins.CORS_ORIGINS);

  return corsOrigins.length > 0
    ? corsOrigins
    : toOriginList(rawOrigins.CORS_ORIGIN);
};

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
  const deepseekApiKey = parsed.DEEPSEEK_API_KEY?.trim() ?? null;
  const requiredScopes = parseScopeList(parsed.AUTH0_REQUIRED_SCOPE);
  const databaseUrl = parsed.DATABASE_URL?.trim() ?? null;
  const razorpayKeyId = parsed.RAZORPAY_KEY_ID?.trim() ?? null;
  const razorpayKeySecret = parsed.RAZORPAY_KEY_SECRET?.trim() ?? null;
  const razorpayWebhookSecret = parsed.RAZORPAY_WEBHOOK_SECRET?.trim() ?? null;
  const razorpayPlanIds = {
    plusMonthly: parsed.RAZORPAY_PLAN_PLUS_MONTHLY?.trim() ?? null,
    plusYearly: parsed.RAZORPAY_PLAN_PLUS_YEARLY?.trim() ?? null,
    proMonthly: parsed.RAZORPAY_PLAN_PRO_MONTHLY?.trim() ?? null,
    proYearly: parsed.RAZORPAY_PLAN_PRO_YEARLY?.trim() ?? null,
  };

  cachedConfig = {
    ...parsed,
    ai: {
      validationProvider: parsed.AI_VALIDATION_PROVIDER,
    },
    auth0: {
      audience: authAudience,
      domain: authDomain,
      isEnabled: Boolean(issuerBaseUrl && authAudience),
      issuerBaseUrl,
      requiredScopes,
    },
    corsOrigins: resolveCorsOrigins(parsed),
    deepseek: {
      apiKey: deepseekApiKey,
      baseUrl: parsed.DEEPSEEK_BASE_URL.trim().replace(/\/+$/, ""),
      model: parsed.DEEPSEEK_MODEL.trim(),
      requestTimeoutMs: parsed.DEEPSEEK_REQUEST_TIMEOUT_MS,
    },
    frontendBaseUrl: parsed.FRONTEND_BASE_URL.trim().replace(/\/+$/, ""),
    hasDeepSeekCredentials: Boolean(deepseekApiKey),
    embeddings: {
      dimensions: parsed.EMBEDDING_DIMENSIONS,
      model: parsed.OLLAMA_EMBEDDING_MODEL.trim(),
      provider: parsed.EMBEDDING_PROVIDER,
    },
    ollama: {
      baseUrl: parsed.OLLAMA_BASE_URL.trim().replace(/\/+$/, ""),
      embeddingModel: parsed.OLLAMA_EMBEDDING_MODEL.trim(),
      requestTimeoutMs: parsed.OLLAMA_REQUEST_TIMEOUT_MS,
    },
    postgres: {
      connectionString: databaseUrl,
      isEnabled: Boolean(databaseUrl),
    },
    razorpay: {
      apiBaseUrl: parsed.RAZORPAY_API_BASE_URL.trim().replace(/\/+$/, ""),
      isCheckoutEnabled: Boolean(razorpayKeyId && razorpayKeySecret),
      isWebhookEnabled: Boolean(razorpayWebhookSecret),
      keyId: razorpayKeyId,
      keySecret: razorpayKeySecret,
      planIds: razorpayPlanIds,
      webhookSecret: razorpayWebhookSecret,
    },
    usageQuotas: {
      monthlyAi: {
        free: parsed.MONTHLY_AI_FREE_QUOTA,
        plus: parsed.MONTHLY_AI_PLUS_QUOTA,
        pro: parsed.MONTHLY_AI_PRO_QUOTA,
      },
    },
  };

  return cachedConfig;
};
