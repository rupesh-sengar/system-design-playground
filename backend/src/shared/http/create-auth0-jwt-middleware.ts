import {
  auth,
  requiredScopes,
  type AuthOptions,
} from "express-oauth2-jwt-bearer";
import type { Request, RequestHandler, Response } from "express";
import type { AppConfig } from "../../config/env.js";
import { ServiceUnavailableError } from "./errors.js";

const failClosedHandler = (
  _request: Request,
  _response: Response,
  next: (error?: unknown) => void,
): void => {
  next(
    new ServiceUnavailableError(
      "Auth0 JWT validation is not configured on the API server.",
    ),
  );
};

export const createAuth0JwtMiddleware = (
  config: AppConfig,
): RequestHandler[] => {
  if (
    !config.auth0.isEnabled ||
    !config.auth0.issuerBaseUrl ||
    !config.auth0.audience
  ) {
    return [failClosedHandler];
  }

  const authMiddleware = auth({
    audience: config.auth0.audience,
    issuerBaseURL: config.auth0.issuerBaseUrl,
    tokenSigningAlg: "RS256",
  } satisfies AuthOptions);

  const middlewares: RequestHandler[] = [authMiddleware];

  if (config.auth0.requiredScopes.length > 0) {
    middlewares.push(requiredScopes(config.auth0.requiredScopes));
  }

  return middlewares;
};
