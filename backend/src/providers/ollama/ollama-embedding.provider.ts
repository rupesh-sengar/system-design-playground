import { z } from "zod";

type OllamaEmbeddingProviderConfig = {
  baseUrl: string;
  dimensions: number;
  model: string;
  requestTimeoutMs: number;
};

const ollamaEmbedResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())),
  model: z.string().optional(),
});

const createTimeoutSignal = (timeoutMs: number): AbortSignal => {
  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
  }, timeoutMs).unref();

  return controller.signal;
};

export class OllamaEmbeddingProvider {
  private readonly embedUrl: string;

  constructor(private readonly config: OllamaEmbeddingProviderConfig) {
    this.embedUrl = `${config.baseUrl.replace(/\/+$/, "")}/api/embed`;
  }

  get dimensions(): number {
    return this.config.dimensions;
  }

  get model(): string {
    return this.config.model;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await fetch(this.embedUrl, {
      body: JSON.stringify({
        dimensions: this.config.dimensions,
        input: texts,
        model: this.config.model,
        truncate: false,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: createTimeoutSignal(this.config.requestTimeoutMs),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(
        `Ollama embedding request failed with ${response.status}: ${responseBody}`,
      );
    }

    const payload = ollamaEmbedResponseSchema.parse(await response.json());

    if (payload.embeddings.length !== texts.length) {
      throw new Error(
        `Ollama returned ${payload.embeddings.length} embeddings for ${texts.length} texts.`,
      );
    }

    payload.embeddings.forEach((embedding, index) => {
      if (embedding.length !== this.config.dimensions) {
        throw new Error(
          `Ollama embedding ${index} has ${embedding.length} dimensions; expected ${this.config.dimensions}. Use a model that matches VECTOR(${this.config.dimensions}), for example nomic-embed-text for 768 dimensions.`,
        );
      }
    });

    return payload.embeddings;
  }
}
