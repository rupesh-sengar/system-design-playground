import { frontendConfig } from "@/config/env";

export interface Auth0Config {
  audience: string | null;
  clientId: string | null;
  connection: string | null;
  domain: string | null;
  isConfigured: boolean;
  scope: string;
}

export const getAuth0Config = (): Auth0Config => {
  const { auth0, features } = frontendConfig;

  return {
    audience: auth0.audience,
    clientId: auth0.clientId,
    connection: auth0.connection,
    domain: auth0.domain,
    isConfigured: features.auth && Boolean(auth0.domain && auth0.clientId),
    scope: auth0.scope,
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

export const buildAuth0EndpointUrl = (
  config: Pick<Auth0Config, "domain">,
  path: string,
): string => {
  const normalizedDomain = config.domain
    ?.replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `https://${normalizedDomain}${normalizedPath}`;
};
