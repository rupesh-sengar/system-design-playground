import type {
  GenerateHintsRequest,
  GenerateHintsResponse,
  ValidateDesignRequest,
  ValidateDesignResponse,
} from "../../modules/ai/contracts.js";

export type ProviderMetadata = {
  configured: boolean;
  model: string;
  orchestration: "google-adk" | "google-genai";
  provider: "gemini";
};

export interface LlmProvider {
  generateHints(input: GenerateHintsRequest): Promise<GenerateHintsResponse>;
  getMetadata(): ProviderMetadata;
  validateDesign(input: ValidateDesignRequest): Promise<ValidateDesignResponse>;
}
