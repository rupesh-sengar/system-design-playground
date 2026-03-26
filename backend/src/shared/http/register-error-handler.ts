import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

const getStatusCode = (error: unknown): number => {
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

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Invalid request payload",
        issues: error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join("."),
        })),
      });
    }

    request.log.error({ err: error }, "request failed");

    const statusCode = getStatusCode(error);

    return reply.status(statusCode).send({
      error: statusCode >= 500 ? "Internal server error" : getMessage(error),
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: "Route not found",
    });
  });
};
