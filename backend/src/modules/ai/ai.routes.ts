import type { FastifyPluginAsync } from "fastify";
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

export const aiRoutes: FastifyPluginAsync<AiRoutesOptions> = async (
  app,
  { llmProvider },
) => {
  const validationWorkflow = new FeedbackValidationWorkflow(llmProvider);
  const hintWorkflow = new HintGenerationWorkflow(llmProvider);

  app.post("/validate-design", async (request) => {
    const payload = validateDesignRequestSchema.parse(request.body);
    const data = await validationWorkflow.run(payload);

    return {
      data,
      meta: llmProvider.getMetadata(),
    };
  });

  app.post("/generate-hints", async (request) => {
    const payload = generateHintsRequestSchema.parse(request.body);
    const data = await hintWorkflow.run(payload);

    return {
      data,
      meta: llmProvider.getMetadata(),
    };
  });
};
