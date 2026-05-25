import type { Request } from "express";
import { ForbiddenRequestError } from "../../shared/http/errors.js";

const EDITORIAL_READ_PERMISSIONS = [
  "read:all",
  "commitly:readall",
  "commitly:writeall",
  "create:all",
];

const EDITORIAL_WRITE_PERMISSIONS = ["create:all", "commitly:writeall"];

const readStringArrayClaim = (
  request: Request,
  claimName: string,
): string[] => {
  const claimValue = request.auth?.payload[claimName];

  if (!Array.isArray(claimValue)) {
    return [];
  }

  return claimValue.filter(
    (value): value is string => typeof value === "string",
  );
};

const readScopeClaim = (request: Request): string[] => {
  const scope = request.auth?.payload.scope;

  if (typeof scope !== "string") {
    return [];
  }

  return scope
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
};

const getGrantedPermissions = (request: Request): Set<string> => {
  return new Set([
    ...readStringArrayClaim(request, "permissions"),
    ...readScopeClaim(request),
  ]);
};

const requireAnyPermission = (
  request: Request,
  acceptedPermissions: string[],
  message: string,
): void => {
  const grantedPermissions = getGrantedPermissions(request);
  const hasPermission = acceptedPermissions.some((permission) =>
    grantedPermissions.has(permission),
  );

  if (!hasPermission) {
    throw new ForbiddenRequestError(message);
  }
};

export const requireStageEditorialReadPermission = (
  request: Request,
): void => {
  requireAnyPermission(
    request,
    EDITORIAL_READ_PERMISSIONS,
    "This account is not allowed to read stage editorials.",
  );
};

export const requireStageEditorialWritePermission = (
  request: Request,
): void => {
  requireAnyPermission(
    request,
    EDITORIAL_WRITE_PERMISSIONS,
    "This account is not allowed to update stage editorials.",
  );
};
