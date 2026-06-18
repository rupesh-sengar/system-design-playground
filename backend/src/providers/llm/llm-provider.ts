import type {
  GenerateHintsRequest,
  GenerateHintsResponse,
  ReviewFullDesignRequest,
  ReviewFullDesignResponse,
  ValidateDesignRequest,
  ValidateDesignResponse,
} from "../../modules/ai/contracts.js";

export type ProviderMetadata = {
  configured: boolean;
  model: string;
  orchestration: "openai-compatible";
  provider: "deepseek";
};

export interface LlmProvider {
  generateHints(input: GenerateHintsRequest): Promise<GenerateHintsResponse>;
  getMetadata(): ProviderMetadata;
  reviewFullDesign(
    input: ReviewFullDesignRequest,
  ): Promise<ReviewFullDesignResponse>;
  validateDesign(input: ValidateDesignRequest): Promise<ValidateDesignResponse>;
}
