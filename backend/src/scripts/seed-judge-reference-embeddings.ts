import "dotenv/config";
import { getEnv } from "../config/env.js";
import { PostgresDatabase } from "../database/postgres.js";
import { problemContextSchema } from "../modules/ai/contracts.js";
import {
  JudgeReferenceChunkRepository,
  type UpsertReferenceChunkInput,
} from "../modules/judge/references/judge-reference.repository.js";
import { buildPreferredSolutionChunks } from "../modules/judge/references/preferred-solution.chunks.js";
import { GeminiEmbeddingProvider } from "../providers/gemini/gemini-embedding.provider.js";
import { OllamaEmbeddingProvider } from "../providers/ollama/ollama-embedding.provider.js";

const EMBEDDING_BATCH_SIZE = 16;

type EmbeddingProvider = {
  readonly dimensions: number;
  readonly model: string;
  embedTexts(texts: string[]): Promise<number[][]>;
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const loadProblemCatalog = async () => {
  const moduleUrl = new URL(
    "../../../frontend/src/data/problemLibrary.ts",
    import.meta.url,
  );
  const catalogModule = (await import(moduleUrl.href)) as {
    problems?: unknown;
  };

  return problemContextSchema.array().parse(catalogModule.problems);
};

const createEmbeddingProvider = (
  config: ReturnType<typeof getEnv>,
): EmbeddingProvider => {
  if (config.embeddings.provider === "ollama") {
    return new OllamaEmbeddingProvider({
      baseUrl: config.ollama.baseUrl,
      dimensions: config.embeddings.dimensions,
      model: config.ollama.embeddingModel,
      requestTimeoutMs: config.ollama.requestTimeoutMs,
    });
  }

  return new GeminiEmbeddingProvider({
    configured: config.hasGeminiCredentials,
    dimensions: config.embeddings.dimensions,
    model: config.embeddings.model,
  });
};

const run = async (): Promise<void> => {
  const config = getEnv();
  const database = new PostgresDatabase(config);
  const embeddingProvider = createEmbeddingProvider(config);
  const repository = new JudgeReferenceChunkRepository(database);

  try {
    if (!config.postgres.isEnabled) {
      throw new Error("DATABASE_URL is required to seed judge embeddings.");
    }

    const problems = await loadProblemCatalog();
    const preferredSolutionChunks = buildPreferredSolutionChunks(problems);

    if (preferredSolutionChunks.length === 0) {
      console.info("No preferred-solution chunks configured.");
      return;
    }

    const rows: UpsertReferenceChunkInput[] = [];

    console.info("building judge reference embeddings", {
      chunkCount: preferredSolutionChunks.length,
      embeddingProvider: config.embeddings.provider,
      problemCount: problems.length,
    });

    for (const batch of chunkArray(preferredSolutionChunks, EMBEDDING_BATCH_SIZE)) {
      const embeddings = await embeddingProvider.embedTexts(
        batch.map((item) => item.content),
      );

      const batchRows = batch.map((item, index) => {
        const embedding = embeddings[index];

        if (!embedding) {
          throw new Error(
            `Missing embedding for chunk ${item.problemId}:${item.criterionId}.`,
          );
        }

        return {
          ...item,
          embedding,
          embeddingDimensions: embeddingProvider.dimensions,
          embeddingModel: embeddingProvider.model,
        };
      });

      rows.push(...batchRows);
      console.info("seeded judge embedding batch", {
        batchSize: batch.length,
        embeddedCount: rows.length,
      });
    }

    const totalUpserted = await repository.replaceAll(rows);

    console.info("judge reference embedding seed complete", {
      embeddingDimensions: embeddingProvider.dimensions,
      embeddingModel: embeddingProvider.model,
      embeddingProvider: config.embeddings.provider,
      problemCount: problems.length,
      totalUpserted,
    });
  } finally {
    await database.close();
  }
};

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
