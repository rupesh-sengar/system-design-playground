import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import type { AppConfig } from "./config/env.js";
import type { PostgresDatabase } from "./database/postgres.js";
import {
  BillingAccountRepository,
  BillingCustomerRepository,
  OnboardingProfileRepository,
  RazorpayWebhookEventRepository,
  UsageEventRepository,
  UserSubscriptionRepository,
} from "./modules/billing/billing.repository.js";
import {
  createBillingPlanRouter,
  createBillingRouter,
  createRazorpayWebhookRouter,
} from "./modules/billing/billing.routes.js";
import { BillingAccessService } from "./modules/billing/entitlements.js";
import { createOnboardingRouter } from "./modules/billing/onboarding.routes.js";
import {
  RazorpayBillingClient,
  RazorpayWebhookService,
  RazorpayWebhookVerifier,
} from "./modules/billing/razorpay.js";
import { createAiRouter } from "./modules/ai/ai.routes.js";
import { StageEditorialRepository } from "./modules/editorials/editorials.repository.js";
import { createEditorialsRouter } from "./modules/editorials/editorials.routes.js";
import { IssueReportRepository } from "./modules/issue-reports/issue-report.repository.js";
import { createIssueReportRouter } from "./modules/issue-reports/issue-report.routes.js";
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
  async (
    request: Request,
    response: Response,
    next: (error?: unknown) => void,
  ): Promise<void> => {
    try {
      await handler(request, response);
    } catch (error) {
      next(error);
    }
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

  const llmProvider = createLlmProvider(config);
  const appUserRepository = new AppUserRepository(database);
  const billingAccountRepository = new BillingAccountRepository(database);
  const billingCustomerRepository = new BillingCustomerRepository(database);
  const onboardingProfileRepository = new OnboardingProfileRepository(database);
  const razorpayWebhookEventRepository = new RazorpayWebhookEventRepository(
    database,
  );
  const issueReportRepository = new IssueReportRepository(database);
  const problemProgressRepository = new ProblemProgressRepository(database);
  const practiceSessionRepository = new PracticeSessionRepository(database);
  const stageEditorialRepository = new StageEditorialRepository(database);
  const usageEventRepository = new UsageEventRepository(database);
  const userSubscriptionRepository = new UserSubscriptionRepository(database);
  const billingAccessService = new BillingAccessService(
    config,
    billingAccountRepository,
    userSubscriptionRepository,
    usageEventRepository,
  );
  const razorpayClient = new RazorpayBillingClient(config);
  const razorpayWebhookVerifier = new RazorpayWebhookVerifier(config);
  const razorpayWebhookService = new RazorpayWebhookService(
    config,
    billingAccountRepository,
    billingCustomerRepository,
    razorpayWebhookEventRepository,
    userSubscriptionRepository,
  );

  app.use(
    "/v1/billing/webhook",
    express.raw({ type: "application/json" }),
    createRazorpayWebhookRouter({
      razorpayWebhookService,
      razorpayWebhookVerifier,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use("/v1/billing", createBillingPlanRouter({ config }));
  app.use(
    "/v1/issue-reports",
    createIssueReportRouter({ issueReportRepository }),
  );

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
    createCurrentAppUserMiddleware({
      appUserRepository,
      billingAccountRepository,
    }),
    createAiRouter({
      billingAccessService,
      llmProvider,
      validationProvider: config.ai.validationProvider,
    }),
  );
  app.use(
    "/v1/billing",
    ...createAuth0JwtMiddleware(config),
    createCurrentAppUserMiddleware({
      appUserRepository,
      billingAccountRepository,
    }),
    createBillingRouter({
      billingAccessService,
      config,
      razorpayClient,
      razorpayWebhookService,
      userSubscriptionRepository,
    }),
  );
  app.use(
    "/v1/onboarding",
    ...createAuth0JwtMiddleware(config),
    createCurrentAppUserMiddleware({
      appUserRepository,
      billingAccountRepository,
    }),
    createOnboardingRouter({ onboardingProfileRepository }),
  );
  app.use(
    "/v1/persistence",
    ...createAuth0JwtMiddleware(config),
    createCurrentAppUserMiddleware({
      appUserRepository,
      billingAccountRepository,
    }),
    createPersistenceRouter({
      appUserRepository,
      billingAccessService,
      practiceSessionRepository,
      problemProgressRepository,
    }),
  );
  app.use(
    "/v1/editorials",
    ...createAuth0JwtMiddleware(config),
    createCurrentAppUserMiddleware({
      appUserRepository,
      billingAccountRepository,
    }),
    createEditorialsRouter({ billingAccessService, stageEditorialRepository }),
  );

  registerErrorHandler(app);

  return app;
};
