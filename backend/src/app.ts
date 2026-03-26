import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { AppConfig } from "./config/env.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";
import { createLlmProvider } from "./providers/llm/create-llm-provider.js";
import { registerErrorHandler } from "./shared/http/register-error-handler.js";

export const buildApp = async (config: AppConfig): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
  });

  await app.register(cors, {
    origin: config.corsOrigins,
  });

  const llmProvider = createLlmProvider(config);

  app.get("/healthz", async () => ({
    provider: llmProvider.getMetadata(),
    status: "ok",
  }));

  await app.register(aiRoutes, {
    prefix: "/v1/ai",
    llmProvider,
  });

  registerErrorHandler(app);

  return app;
};
