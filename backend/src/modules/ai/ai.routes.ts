import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { AppConfig } from "../../config/env.js";
import type { BillingAccessService } from "../billing/entitlements.js";
import { requireCurrentAppUser } from "../persistence/current-app-user.middleware.js";
import {
  generateHintsRequestSchema,
  validateDesignRequestSchema,
} from "./contracts.js";
import type { LlmProvider } from "../../providers/llm/llm-provider.js";
import { FeedbackValidationWorkflow } from "./workflows/feedback-validation.workflow.js";
import { HintGenerationWorkflow } from "./workflows/hint-generation.workflow.js";

type AiRoutesOptions = {
  billingAccessService: BillingAccessService;
  llmProvider: LlmProvider;
  validationProvider: AppConfig["ai"]["validationProvider"];
};

const createAsyncHandler =
  (
    handler: (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => Promise<void>,
  ) =>
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };

export const createAiRouter = ({
  billingAccessService,
  llmProvider,
  validationProvider,
}: AiRoutesOptions): Router => {
  const router = Router();
  const validationWorkflow = new FeedbackValidationWorkflow({
    llmProvider,
    validationProvider,
  });
  const hintWorkflow = new HintGenerationWorkflow(llmProvider);

  router.post(
    "/validate-design",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      const payload = validateDesignRequestSchema.parse(request.body);
      await billingAccessService.assertCanUseAi(appUser.id);

      const result = await validationWorkflow.run(payload);
      await billingAccessService.recordAiUsage({
        eventType: "ai_validation",
        metadata: {
          problemId: payload.problem.id,
          stageId: payload.stageId,
        },
        userId: appUser.id,
      });

      response.json(result);
    }),
  );

  router.post(
    "/generate-hints",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      const payload = generateHintsRequestSchema.parse(request.body);
      await billingAccessService.assertCanUseAi(appUser.id);

      const data = await hintWorkflow.run(payload);
      await billingAccessService.recordAiUsage({
        eventType: "ai_hint",
        metadata: {
          problemId: payload.problem.id,
          stageId: payload.stageId,
        },
        userId: appUser.id,
      });

      response.json({
        data,
        meta: llmProvider.getMetadata(),
      });
    }),
  );

  return router;
};
