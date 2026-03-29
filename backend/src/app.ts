import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import type { AppConfig } from "./config/env.js";
import { createAiRouter } from "./modules/ai/ai.routes.js";
import { createLlmProvider } from "./providers/llm/create-llm-provider.js";
import { createAuth0JwtMiddleware } from "./shared/http/create-auth0-jwt-middleware.js";
import { registerErrorHandler } from "./shared/http/register-error-handler.js";

export const buildApp = (config: AppConfig): Express => {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  const llmProvider = createLlmProvider(config);

  app.get("/healthz", (_request: Request, response: Response) => {
    response.json({
      auth: {
        audience: config.auth0.audience,
        domain: config.auth0.domain,
        enabled: config.auth0.isEnabled,
        requiredScopes: config.auth0.requiredScopes,
      },
      provider: llmProvider.getMetadata(),
      status: "ok",
    });
  });

  app.use(
    "/v1/ai",
    ...createAuth0JwtMiddleware(config),
    createAiRouter({ llmProvider }),
  );

  registerErrorHandler(app);

  return app;
};
