import type { Express, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

const getStatusCode = (error: unknown): number => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return 500;
};

const getMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed";
};

const getHeaders = (error: unknown): Record<string, string> => {
  if (
    typeof error === "object" &&
    error !== null &&
    "headers" in error &&
    typeof error.headers === "object" &&
    error.headers !== null
  ) {
    return Object.fromEntries(
      Object.entries(error.headers).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  }

  return {};
};

export const registerErrorHandler = (app: Express): void => {
  app.use((_request: Request, reply: Response) => {
    reply.status(404).json({
      error: "Route not found",
    });
  });

  app.use(
    (
      error: unknown,
      request: Request,
      reply: Response,
      _next: NextFunction,
    ) => {
      if (error instanceof ZodError) {
        return reply.status(400).json({
          error: "Invalid request payload",
          issues: error.issues.map((issue) => ({
            message: issue.message,
            path: issue.path.join("."),
          })),
        });
      }

      console.error("request failed", {
        error,
        method: request.method,
        path: request.path,
      });

      const statusCode = getStatusCode(error);
      const headers = getHeaders(error);

      Object.entries(headers).forEach(([headerName, headerValue]) => {
        reply.setHeader(headerName, headerValue);
      });

      return reply.status(statusCode).json({
        error: statusCode >= 500 ? "Internal server error" : getMessage(error),
      });
    },
  );
};
