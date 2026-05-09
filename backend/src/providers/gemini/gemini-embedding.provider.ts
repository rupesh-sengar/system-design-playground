import { GoogleGenAI } from "@google/genai";

type GeminiEmbeddingProviderConfig = {
  configured: boolean;
  dimensions: number;
  model: string;
};

type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

class EmbeddingProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingProviderUnavailableError";
  }
}

export class GeminiEmbeddingProvider {
  private readonly client: GoogleGenAI | null;

  constructor(private readonly config: GeminiEmbeddingProviderConfig) {
    if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
    }

    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  get dimensions(): number {
    return this.config.dimensions;
  }

  get model(): string {
    return this.config.model;
  }

  async embedTexts(
    texts: string[],
    taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT",
  ): Promise<number[][]> {
    if (!this.config.configured || !this.client) {
      throw new EmbeddingProviderUnavailableError(
        "Gemini credentials are missing. Set GEMINI_API_KEY or GOOGLE_API_KEY.",
      );
    }

    if (texts.length === 0) {
      return [];
    }

    const response = await this.client.models.embedContent({
      model: this.config.model,
      contents: texts,
      config: {
        outputDimensionality: this.config.dimensions,
        taskType,
      },
    });

    const embeddings = response.embeddings?.map(
      (embedding) => embedding.values ?? [],
    );

    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error(
        `Gemini returned ${embeddings?.length ?? 0} embeddings for ${texts.length} texts.`,
      );
    }

    embeddings.forEach((embedding, index) => {
      if (embedding.length !== this.config.dimensions) {
        throw new Error(
          `Embedding ${index} has ${embedding.length} dimensions; expected ${this.config.dimensions}.`,
        );
      }
    });

    return embeddings;
  }
}
