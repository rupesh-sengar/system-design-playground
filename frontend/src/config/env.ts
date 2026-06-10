export type AppEnvironment = "local" | "production";

export interface FrontendFeatureFlags {
  aiReview: boolean;
  auth: boolean;
  billing: boolean;
  developmentNotice: boolean;
  onboarding: boolean;
}

interface FrontendAuth0Config {
  audience: string | null;
  clientId: string | null;
  connection: string;
  domain: string | null;
  scope: string;
}

interface FrontendConfig {
  apiBaseUrl: string;
  appEnv: AppEnvironment;
  auth0: FrontendAuth0Config;
  features: FrontendFeatureFlags;
  isProduction: boolean;
}

const DEFAULT_AUTH0_DATABASE_CONNECTION = "Username-Password-Authentication";
const LOCAL_API_BASE_URL = "http://localhost:8080";
const PRODUCTION_API_BASE_URL =
  "https://system-design-playground-oky8.onrender.com";

const getTrimmedEnvValue = (
  value: string | undefined,
): string | null => {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
};

const getBooleanEnvValue = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
};

const getAppEnvironment = (): AppEnvironment => {
  const configuredEnv = getTrimmedEnvValue(import.meta.env.VITE_APP_ENV)
    ?.toLowerCase();

  if (configuredEnv === "production" || configuredEnv === "prod") {
    return "production";
  }

  return import.meta.env.PROD ? "production" : "local";
};

const buildConfig = (): FrontendConfig => {
  const appEnv = getAppEnvironment();
  const apiBaseUrl =
    getTrimmedEnvValue(import.meta.env.VITE_API_BASE_URL) ??
    (appEnv === "production" ? PRODUCTION_API_BASE_URL : LOCAL_API_BASE_URL);

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    appEnv,
    auth0: {
      audience: getTrimmedEnvValue(import.meta.env.VITE_AUTH0_AUDIENCE),
      clientId: getTrimmedEnvValue(import.meta.env.VITE_AUTH0_CLIENT_ID),
      connection:
        getTrimmedEnvValue(import.meta.env.VITE_AUTH0_CONNECTION) ??
        DEFAULT_AUTH0_DATABASE_CONNECTION,
      domain: getTrimmedEnvValue(import.meta.env.VITE_AUTH0_DOMAIN),
      scope:
        getTrimmedEnvValue(import.meta.env.VITE_AUTH0_SCOPE) ??
        "openid profile email",
    },
    features: {
      aiReview: getBooleanEnvValue(import.meta.env.VITE_ENABLE_AI_REVIEW, true),
      auth: getBooleanEnvValue(import.meta.env.VITE_ENABLE_AUTH, true),
      billing: getBooleanEnvValue(import.meta.env.VITE_ENABLE_BILLING, true),
      developmentNotice: getBooleanEnvValue(
        import.meta.env.VITE_ENABLE_DEVELOPMENT_NOTICE,
        true,
      ),
      onboarding: getBooleanEnvValue(
        import.meta.env.VITE_ENABLE_ONBOARDING,
        true,
      ),
    },
    isProduction: appEnv === "production",
  };
};

export const frontendConfig = buildConfig();
