export interface Auth0Config {
  audience: string | null;
  clientId: string | null;
  domain: string | null;
  isConfigured: boolean;
  scope: string;
}

const getTrimmedEnvValue = (
  value: string | undefined,
): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const getAuth0Config = (): Auth0Config => {
  const domain = getTrimmedEnvValue(import.meta.env.VITE_AUTH0_DOMAIN);
  const clientId = getTrimmedEnvValue(import.meta.env.VITE_AUTH0_CLIENT_ID);
  const audience = getTrimmedEnvValue(import.meta.env.VITE_AUTH0_AUDIENCE);
  const scope =
    getTrimmedEnvValue(import.meta.env.VITE_AUTH0_SCOPE) ??
    "openid profile email";

  return {
    audience,
    clientId,
    domain,
    isConfigured: Boolean(domain && clientId),
    scope,
  };
};

export const buildAuth0AuthorizationParams = (
  config: Auth0Config,
): {
  audience?: string;
  redirect_uri: string;
  scope: string;
} => {
  return {
    ...(config.audience ? { audience: config.audience } : {}),
    redirect_uri: window.location.origin,
    scope: config.scope,
  };
};
