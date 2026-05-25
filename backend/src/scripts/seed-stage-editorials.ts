import "dotenv/config";
import { getEnv } from "../config/env.js";
import { PostgresDatabase } from "../database/postgres.js";
import { problemContextSchema } from "../modules/ai/contracts.js";
import { buildStageEditorialSeeds } from "../modules/editorials/stage-editorial-content.js";
import { StageEditorialRepository } from "../modules/editorials/editorials.repository.js";

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

const run = async (): Promise<void> => {
  const config = getEnv();
  const database = new PostgresDatabase(config);
  const repository = new StageEditorialRepository(database);

  try {
    if (!config.postgres.isEnabled) {
      throw new Error("DATABASE_URL is required to seed stage editorials.");
    }

    const problems = await loadProblemCatalog();
    const editorialSeeds = buildStageEditorialSeeds(problems);
    const totalUpserted = await repository.upsertSystemSeeds(editorialSeeds);

    console.info("stage editorial seed complete", {
      problemCount: problems.length,
      stageCount: editorialSeeds.length / Math.max(problems.length, 1),
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
