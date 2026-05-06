import { GoogleGenAI } from "@google/genai";
import {
  generateHintsResponseSchema,
  validateDesignResponseSchema,
  type GenerateHintsRequest,
  type GenerateHintsResponse,
  type ValidateDesignRequest,
  type ValidateDesignResponse,
} from "../../modules/ai/contracts.js";
import {
  feedbackValidationInstruction,
  buildHintPrompt,
  buildValidationPrompt,
  hintGenerationInstruction,
} from "../../modules/ai/prompts.js";
import { parseStructuredOutput } from "../../shared/utils/json.js";
import type { LlmProvider, ProviderMetadata } from "../llm/llm-provider.js";

type GeminiAdkProviderConfig = {
  appName: string;
  configured: boolean;
  model: string;
};

class ServiceUnavailableError extends Error {
  statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

class ProviderResponseError extends Error {
  statusCode = 502;

  constructor(message: string) {
    super(message);
    this.name = "ProviderResponseError";
  }
}

export class GeminiAdkProvider implements LlmProvider {
  private readonly client: GoogleGenAI | null;

  constructor(private readonly config: GeminiAdkProviderConfig) {
    if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
    }

    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  getMetadata(): ProviderMetadata {
    return {
      configured: this.config.configured,
      model: this.config.model,
      orchestration: "google-genai",
      provider: "gemini",
    };
  }

  async validateDesign(
    input: ValidateDesignRequest,
  ): Promise<ValidateDesignResponse> {
    this.ensureConfigured();

    const rawOutput = await this.runPrompt({
      instruction: feedbackValidationInstruction,
      operation: "validate-design",
      prompt: buildValidationPrompt(input),
    });

    return parseStructuredOutput(validateDesignResponseSchema, rawOutput);
  }

  async generateHints(
    input: GenerateHintsRequest,
  ): Promise<GenerateHintsResponse> {
    this.ensureConfigured();

    const rawOutput = await this.runPrompt({
      instruction: hintGenerationInstruction,
      operation: "generate-hints",
      prompt: buildHintPrompt(input),
    });

    return parseStructuredOutput(generateHintsResponseSchema, rawOutput);
  }

  private ensureConfigured(): void {
    if (!this.config.configured) {
      throw new ServiceUnavailableError(
        "Gemini credentials are missing. Set GEMINI_API_KEY or GOOGLE_API_KEY.",
      );
    }
  }

  private async runPrompt({
    instruction,
    operation,
    prompt,
  }: {
    instruction: string;
    operation: string;
    prompt: string;
  }): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableError(
        "Gemini credentials are missing. Set GEMINI_API_KEY or GOOGLE_API_KEY.",
      );
    }

    const response = await this.client.models.generateContent({
      model: this.config.model,
      contents: prompt,
      config: {
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        systemInstruction: instruction,
        temperature: 0.2,
      },
    });

    const text = response.text?.trim() ?? "";

    if (text) {
      return text;
    }

    console.warn("gemini returned an empty text response", {
      candidates: response.candidates?.map((candidate) => ({
        finishMessage: candidate.finishMessage,
        finishReason: candidate.finishReason,
      })),
      model: this.config.model,
      operation,
      promptFeedback: response.promptFeedback,
      usageMetadata: response.usageMetadata,
    });

    throw new ProviderResponseError("Gemini returned an empty response.");
  }
}
