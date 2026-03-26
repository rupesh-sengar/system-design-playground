import type {
  ValidateDesignRequest,
  ValidateDesignResponse,
} from "../contracts.js";
import type { LlmProvider } from "../../../providers/llm/llm-provider.js";

export class FeedbackValidationWorkflow {
  constructor(private readonly llmProvider: LlmProvider) {}

  run(input: ValidateDesignRequest): Promise<ValidateDesignResponse> {
    return this.llmProvider.validateDesign(input);
  }
}
