import {
  getFunctionCalls,
  getFunctionResponses,
  InMemoryRunner,
  isFinalResponse,
  stringifyContent,
} from "@google/adk";
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

class ProviderResponseError extends Error {
  statusCode = 502;

  constructor(message: string) {
    super(message);
    this.name = "ProviderResponseError";
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
    let lastTextResponse = "";
    const diagnostics = {
      finalEvents: 0,
      functionCallEvents: 0,
      functionResponseEvents: 0,
      partialEvents: 0,
      textEvents: 0,
      totalEvents: 0,
    };

    for await (const event of runner.runAsync({
      userId: DEFAULT_USER_ID,
      sessionId,
      newMessage: createUserContent(prompt),
    })) {
      diagnostics.totalEvents += 1;

      const functionCallCount = getFunctionCalls(event).length;
      const functionResponseCount = getFunctionResponses(event).length;

      if (functionCallCount > 0) {
        diagnostics.functionCallEvents += 1;
      }

      const text = stringifyContent(event).trim();

      if (functionResponseCount > 0) {
        diagnostics.functionResponseEvents += 1;
      }

      if (event.partial) {
        diagnostics.partialEvents += 1;
      }

      if (text) {
        diagnostics.textEvents += 1;
        lastTextResponse = text;
      }

      if (!isFinalResponse(event)) {
        continue;
      }

      diagnostics.finalEvents += 1;

      if (text) {
        finalResponse = text;
      }
    }

    const response = finalResponse || lastTextResponse;

    if (!response) {
      console.warn(
        "gemini adk completed without a text response",
        diagnostics,
      );
      throw new ProviderResponseError(
        "Gemini did not return a text response.",
      );
    }

    if (!finalResponse) {
      console.warn(
        "gemini adk returned text without a final response marker",
        diagnostics,
      );
    }

    return response;
  }
}
