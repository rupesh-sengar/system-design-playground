import type {
  GenerateHintsRequest,
  GenerateHintsResponse,
} from "../contracts.js";
import type { LlmProvider } from "../../../providers/llm/llm-provider.js";

export class HintGenerationWorkflow {
  constructor(private readonly llmProvider: LlmProvider) {}

  run(input: GenerateHintsRequest): Promise<GenerateHintsResponse> {
    return this.llmProvider.generateHints(input);
  }
}
