import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AppUserRecord, AppUserRepository } from "./persistence.repository.js";
import { UnauthorizedRequestError } from "../../shared/http/errors.js";
import type { BillingAccountRepository } from "../billing/billing.repository.js";

interface CreateCurrentAppUserMiddlewareOptions {
  appUserRepository: AppUserRepository;
  billingAccountRepository?: BillingAccountRepository;
}

declare global {
  namespace Express {
    interface Request {
      appUser?: AppUserRecord;
    }
  }
}

const readStringClaim = (
  request: Request,
  claimName: string,
): string | null => {
  const claimValue = request.auth?.payload[claimName];

  if (typeof claimValue !== "string") {
    return null;
  }

  const trimmedValue = claimValue.trim();
  return trimmedValue ? trimmedValue : null;
};

const readNamespacedStringClaim = (
  request: Request,
  claimName: string,
): string | null => {
  const claimSuffix = `/${claimName}`;

  for (const [key, value] of Object.entries(request.auth?.payload ?? {})) {
    if (!key.endsWith(claimSuffix) || typeof value !== "string") {
      continue;
    }

    const trimmedValue = value.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  return null;
};

const readFirstStringClaim = (
  request: Request,
  claimNames: string[],
): string | null => {
  for (const claimName of claimNames) {
    const claimValue =
      readStringClaim(request, claimName) ??
      readNamespacedStringClaim(request, claimName);

    if (claimValue) {
      return claimValue;
    }
  }

  return null;
};

const resolveCurrentAppUserInput = (
  request: Request,
): {
  authProvider: string;
  authSubject: string;
  displayName: string | null;
  email: string | null;
  pictureUrl: string | null;
  username: string | null;
} => {
  const authSubject = readStringClaim(request, "sub");

  if (!authSubject) {
    throw new UnauthorizedRequestError(
      "Authenticated user is missing a subject claim.",
    );
  }

  return {
    authProvider: "auth0",
    authSubject,
    displayName:
      readFirstStringClaim(request, ["name", "nickname", "preferred_username"]) ??
      readFirstStringClaim(request, ["email"]),
    email: readFirstStringClaim(request, ["email"]),
    pictureUrl: readFirstStringClaim(request, ["picture"]),
    username: readFirstStringClaim(request, [
      "preferred_username",
      "nickname",
      "username",
    ]),
  };
};

export const createCurrentAppUserMiddleware = ({
  appUserRepository,
  billingAccountRepository,
}: CreateCurrentAppUserMiddlewareOptions): RequestHandler => {
  return async (
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const appUser = await appUserRepository.upsertByAuthIdentity(
        resolveCurrentAppUserInput(request),
      );
      await billingAccountRepository?.ensureForUser(appUser.id);
      request.appUser = appUser;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireCurrentAppUser = (request: Request): AppUserRecord => {
  if (!request.appUser) {
    throw new UnauthorizedRequestError("Authenticated user context is missing.");
  }

  return request.appUser;
};
