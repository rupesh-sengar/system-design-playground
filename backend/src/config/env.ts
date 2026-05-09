import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("system-design-platform"),
  AUTH0_AUDIENCE: z.string().min(1).optional(),
  AUTH0_DOMAIN: z.string().min(1).optional(),
  AUTH0_REQUIRED_SCOPE: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1).optional(),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().optional(),
  EMBEDDING_PROVIDER: z.enum(["gemini", "ollama"]).default("gemini"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  GEMINI_EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  HOST: z.string().min(1).default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  OLLAMA_BASE_URL: z.string().min(1).default("http://localhost:11434"),
  OLLAMA_EMBEDDING_MODEL: z.string().min(1).default("nomic-embed-text"),
  OLLAMA_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
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
  embeddings: {
    dimensions: number;
    model: string;
    provider: "gemini" | "ollama";
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

const normalizeEmbeddingModel = (model: string): string => {
  const normalizedModel = model.trim().replace(/^models\//, "");

  if (normalizedModel === "text-embedding-004") {
    return "gemini-embedding-001";
  }

  return normalizedModel;
};

export const getEnv = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.parse(process.env);
  const issuerBaseUrl = normalizeIssuerBaseUrl(parsed.AUTH0_DOMAIN);
  const authAudience = parsed.AUTH0_AUDIENCE?.trim() ?? null;
  const authDomain = parsed.AUTH0_DOMAIN?.trim() ?? null;
  const requiredScopes = parseScopeList(parsed.AUTH0_REQUIRED_SCOPE);
  const databaseUrl = parsed.DATABASE_URL?.trim() ?? null;
  const embeddingProvider = parsed.EMBEDDING_PROVIDER;
  const embeddingDimensions =
    parsed.EMBEDDING_DIMENSIONS ?? parsed.GEMINI_EMBEDDING_DIMENSIONS;
  const embeddingModel =
    embeddingProvider === "ollama"
      ? parsed.OLLAMA_EMBEDDING_MODEL.trim()
      : normalizeEmbeddingModel(parsed.GEMINI_EMBEDDING_MODEL);

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
    embeddings: {
      dimensions: embeddingDimensions,
      model: embeddingModel,
      provider: embeddingProvider,
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
  };

  return cachedConfig;
};
