import { InMemoryRunner, isFinalResponse, stringifyContent } from "@google/adk";
import { createUserContent } from "@google/genai";
import {
  generateHintsResponseSchema,
  validateDesignResponseSchema,
  type GenerateHintsRequest,
  type GenerateHintsResponse,
  type ValidateDesignRequest,
  type ValidateDesignResponse,
} from "../../modules/ai/contracts.js";
import {
  createFeedbackValidationAgent,
  createHintGenerationAgent,
} from "../../modules/ai/agents/system-design-coach.agent.js";
import {
  buildHintPrompt,
  buildValidationPrompt,
} from "../../modules/ai/prompts.js";
import { parseStructuredOutput } from "../../shared/utils/json.js";
import type { LlmProvider, ProviderMetadata } from "../llm/llm-provider.js";

type GeminiAdkProviderConfig = {
  appName: string;
  configured: boolean;
  model: string;
};

const DEFAULT_USER_ID = "system-design-platform";

class ServiceUnavailableError extends Error {
  statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

export class GeminiAdkProvider implements LlmProvider {
  private readonly feedbackRunner: InMemoryRunner;
  private readonly hintRunner: InMemoryRunner;

  constructor(private readonly config: GeminiAdkProviderConfig) {
    if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
    }

    this.feedbackRunner = new InMemoryRunner({
      agent: createFeedbackValidationAgent(config.model),
      appName: config.appName,
    });
    this.hintRunner = new InMemoryRunner({
      agent: createHintGenerationAgent(config.model),
      appName: config.appName,
    });
  }

  getMetadata(): ProviderMetadata {
    return {
      configured: this.config.configured,
      model: this.config.model,
      orchestration: "google-adk",
      provider: "gemini",
    };
  }

  async validateDesign(
    input: ValidateDesignRequest,
  ): Promise<ValidateDesignResponse> {
    this.ensureConfigured();

    const rawOutput = await this.runPrompt({
      prompt: buildValidationPrompt(input),
      runner: this.feedbackRunner,
      sessionId: `validation-${crypto.randomUUID()}`,
      state: {
        requestedStage: input.stageId ?? "overall",
      },
    });

    return parseStructuredOutput(validateDesignResponseSchema, rawOutput);
  }

  async generateHints(
    input: GenerateHintsRequest,
  ): Promise<GenerateHintsResponse> {
    this.ensureConfigured();

    const rawOutput = await this.runPrompt({
      prompt: buildHintPrompt(input),
      runner: this.hintRunner,
      sessionId: `hints-${crypto.randomUUID()}`,
      state: {
        requestedStage: input.stageId,
      },
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
    prompt,
    runner,
    sessionId,
    state,
  }: {
    prompt: string;
    runner: InMemoryRunner;
    sessionId: string;
    state: Record<string, string>;
  }): Promise<string> {
    await runner.sessionService.createSession({
      appName: this.config.appName,
      userId: DEFAULT_USER_ID,
      sessionId,
      state,
    });

    let finalResponse = "";

    for await (const event of runner.runAsync({
      userId: DEFAULT_USER_ID,
      sessionId,
      newMessage: createUserContent(prompt),
    })) {
      if (!isFinalResponse(event)) {
        continue;
      }

      const text = stringifyContent(event).trim();

      if (text) {
        finalResponse = text;
      }
    }

    if (!finalResponse) {
      throw new Error(
        "Gemini ADK completed without returning a final response.",
      );
    }

    return finalResponse;
  }
}
