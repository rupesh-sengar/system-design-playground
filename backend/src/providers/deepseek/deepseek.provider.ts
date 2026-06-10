import { z } from "zod";
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
import { HttpError, ServiceUnavailableError } from "../../shared/http/errors.js";
import { parseStructuredOutput } from "../../shared/utils/json.js";
import type { LlmProvider, ProviderMetadata } from "../llm/llm-provider.js";

type DeepSeekProviderConfig = {
  apiKey: string | null;
  baseUrl: string;
  configured: boolean;
  model: string;
  requestTimeoutMs: number;
};

const deepSeekChatResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            finish_reason: z.string().nullable().optional(),
            message: z
              .object({
                content: z.string().nullable().optional(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
    usage: z.unknown().optional(),
  })
  .passthrough();

class ProviderResponseError extends HttpError {
  constructor(message: string) {
    super(message, 502);
  }
}

class ProviderRateLimitError extends HttpError {
  readonly headers?: Record<string, string>;

  constructor(retryAfter: string | null) {
    super("DeepSeek rate limit exceeded.", 429);

    if (retryAfter) {
      this.headers = {
        "retry-after": retryAfter,
      };
    }
  }
}

const createTimeoutSignal = (timeoutMs: number): AbortSignal => {
  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
  }, timeoutMs).unref();

  return controller.signal;
};

const parseResponseText = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return JSON.stringify(await response.json());
  }

  return response.text();
};

export class DeepSeekProvider implements LlmProvider {
  private readonly chatCompletionsUrl: string;

  constructor(private readonly config: DeepSeekProviderConfig) {
    this.chatCompletionsUrl = `${config.baseUrl.replace(
      /\/+$/,
      "",
    )}/chat/completions`;
  }

  getMetadata(): ProviderMetadata {
    return {
      configured: this.config.configured,
      model: this.config.model,
      orchestration: "openai-compatible",
      provider: "deepseek",
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
    if (!this.config.configured || !this.config.apiKey) {
      throw new ServiceUnavailableError(
        "DeepSeek credentials are missing. Set DEEPSEEK_API_KEY.",
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
    this.ensureConfigured();

    let response: Response;

    try {
      response = await fetch(this.chatCompletionsUrl, {
        body: JSON.stringify({
          max_tokens: 4096,
          messages: [
            {
              content: instruction,
              role: "system",
            },
            {
              content: prompt,
              role: "user",
            },
          ],
          model: this.config.model,
          response_format: {
            type: "json_object",
          },
          stream: false,
          temperature: 0.2,
          thinking: {
            type: "disabled",
          },
        }),
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: createTimeoutSignal(this.config.requestTimeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ServiceUnavailableError("DeepSeek request timed out.");
      }

      throw error;
    }

    if (response.status === 429) {
      throw new ProviderRateLimitError(response.headers.get("retry-after"));
    }

    if (!response.ok) {
      const responseBody = await parseResponseText(response);
      console.warn("deepseek request failed", {
        body: responseBody,
        model: this.config.model,
        operation,
        status: response.status,
      });

      if (response.status === 401 || response.status === 403) {
        throw new ServiceUnavailableError("DeepSeek credentials were rejected.");
      }

      throw new ProviderResponseError(
        `DeepSeek request failed with ${response.status}.`,
      );
    }

    const payload = deepSeekChatResponseSchema.parse(await response.json());
    const text = payload.choices[0]?.message.content?.trim() ?? "";

    if (text) {
      return text;
    }

    console.warn("deepseek returned an empty text response", {
      choices: payload.choices.map((choice) => ({
        finishReason: choice.finish_reason,
      })),
      model: this.config.model,
      operation,
      usage: payload.usage,
    });

    throw new ProviderResponseError("DeepSeek returned an empty response.");
  }
}
