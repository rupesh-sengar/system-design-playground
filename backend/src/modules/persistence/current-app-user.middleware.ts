import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AppUserRecord, AppUserRepository } from "./persistence.repository.js";
import { UnauthorizedRequestError } from "../../shared/http/errors.js";

interface CreateCurrentAppUserMiddlewareOptions {
  appUserRepository: AppUserRepository;
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

const resolveCurrentAppUserInput = (
  request: Request,
): {
  authProvider: string;
  authSubject: string;
  displayName: string | null;
  email: string | null;
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
      readStringClaim(request, "name") ?? readStringClaim(request, "nickname"),
    email: readStringClaim(request, "email"),
  };
};

export const createCurrentAppUserMiddleware = ({
  appUserRepository,
}: CreateCurrentAppUserMiddlewareOptions): RequestHandler => {
  return async (
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      request.appUser = await appUserRepository.upsertByAuthIdentity(
        resolveCurrentAppUserInput(request),
      );
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
