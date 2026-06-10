import type { AppConfig } from "../../../config/env.js";
import type { LlmProvider } from "../../../providers/llm/llm-provider.js";
import { judgeSubmission } from "../../judge/judge.service.js";
import type { JudgeProviderMeta } from "../../judge/types.js";
import type {
  ValidateDesignRequest,
  ValidateDesignResponse,
} from "../contracts.js";

type FeedbackValidationWorkflowOptions = {
  llmProvider: LlmProvider;
  validationProvider: AppConfig["ai"]["validationProvider"];
};

type FeedbackValidationEnvelope = {
  data: ValidateDesignResponse;
  meta: JudgeProviderMeta | ReturnType<LlmProvider["getMetadata"]>;
};

export class FeedbackValidationWorkflow {
  constructor(private readonly options: FeedbackValidationWorkflowOptions) {}

  async run(input: ValidateDesignRequest): Promise<FeedbackValidationEnvelope> {
    if (this.options.validationProvider === "rule-engine") {
      return judgeSubmission(input);
    }

    return {
      data: await this.options.llmProvider.validateDesign(input),
      meta: this.options.llmProvider.getMetadata(),
    };
  }
}
