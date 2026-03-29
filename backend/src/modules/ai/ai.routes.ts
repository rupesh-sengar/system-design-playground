import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  generateHintsRequestSchema,
  validateDesignRequestSchema,
} from "./contracts.js";
import type { LlmProvider } from "../../providers/llm/llm-provider.js";
import { FeedbackValidationWorkflow } from "./workflows/feedback-validation.workflow.js";
import { HintGenerationWorkflow } from "./workflows/hint-generation.workflow.js";

type AiRoutesOptions = {
  llmProvider: LlmProvider;
};

const createAsyncHandler =
  (
    handler: (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => Promise<void>,
  ) =>
  (request: Request, response: Response, next: NextFunction): void => {
    void handler(request, response, next).catch(next);
  };

export const createAiRouter = ({ llmProvider }: AiRoutesOptions): Router => {
  const router = Router();
  const validationWorkflow = new FeedbackValidationWorkflow(llmProvider);
  const hintWorkflow = new HintGenerationWorkflow(llmProvider);

  router.post(
    "/validate-design",
    createAsyncHandler(async (request, response) => {
      const payload = validateDesignRequestSchema.parse(request.body);
      const data = await validationWorkflow.run(payload);

      response.json({
        data,
        meta: llmProvider.getMetadata(),
      });
    }),
  );

  router.post(
    "/generate-hints",
    createAsyncHandler(async (request, response) => {
      const payload = generateHintsRequestSchema.parse(request.body);
      const data = await hintWorkflow.run(payload);

      response.json({
        data,
        meta: llmProvider.getMetadata(),
      });
    }),
  );

  return router;
};
