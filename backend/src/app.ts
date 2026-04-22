import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import type { AppConfig } from "./config/env.js";
import type { PostgresDatabase } from "./database/postgres.js";
import { createAiRouter } from "./modules/ai/ai.routes.js";
import { createCurrentAppUserMiddleware } from "./modules/persistence/current-app-user.middleware.js";
import {
  AppUserRepository,
  PracticeSessionRepository,
  ProblemProgressRepository,
} from "./modules/persistence/persistence.repository.js";
import { createPersistenceRouter } from "./modules/persistence/persistence.routes.js";
import { createLlmProvider } from "./providers/llm/create-llm-provider.js";
import { createAuth0JwtMiddleware } from "./shared/http/create-auth0-jwt-middleware.js";
import { registerErrorHandler } from "./shared/http/register-error-handler.js";

const createAsyncHandler =
  (
    handler: (request: Request, response: Response) => Promise<void>,
  ) =>
  (request: Request, response: Response, next: (error?: unknown) => void) => {
    void handler(request, response).catch(next);
  };

export const buildApp = (
  config: AppConfig,
  database: PostgresDatabase,
): Express => {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  const llmProvider = createLlmProvider(config);
  const appUserRepository = new AppUserRepository(database);
  const problemProgressRepository = new ProblemProgressRepository(database);
  const practiceSessionRepository = new PracticeSessionRepository(database);

  app.get(
    "/healthz",
    createAsyncHandler(async (_request, response) => {
      const databaseHealth = await database.checkHealth();

      response.json({
        auth: {
          audience: config.auth0.audience,
          domain: config.auth0.domain,
          enabled: config.auth0.isEnabled,
          requiredScopes: config.auth0.requiredScopes,
        },
        database: databaseHealth,
        provider: llmProvider.getMetadata(),
        status: "ok",
      });
    }),
  );

  app.use(
    "/v1/ai",
    ...createAuth0JwtMiddleware(config),
    createAiRouter({ llmProvider }),
  );
  app.use(
    "/v1/persistence",
    ...createAuth0JwtMiddleware(config),
    createCurrentAppUserMiddleware({ appUserRepository }),
    createPersistenceRouter({
      practiceSessionRepository,
      problemProgressRepository,
    }),
  );

  registerErrorHandler(app);

  return app;
};
