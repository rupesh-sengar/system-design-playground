import { createHash } from "node:crypto";
import type { PostgresDatabase, SqlClient } from "../../../database/postgres.js";
import type { StageId } from "../../ai/contracts.js";
import type {
  JudgeReferenceChunkType,
  PreferredSolutionChunk,
} from "./preferred-solution.chunks.js";

export type UpsertReferenceChunkInput = PreferredSolutionChunk & {
  embedding: number[];
  embeddingDimensions: number;
  embeddingModel: string;
};

export type ReferenceChunkMatch = {
  chunkType: JudgeReferenceChunkType;
  content: string;
  criterionId: string;
  metadata: Record<string, unknown>;
  problemId: string;
  rubricVersion: string;
  similarityScore: number;
  stageId: StageId;
};

type FindNearestReferenceChunksInput = {
  chunkTypes?: JudgeReferenceChunkType[];
  embedding: number[];
  limit?: number;
  problemId: string;
  rubricVersion?: string;
  stageId: StageId;
};

const hashContent = (content: string): string =>
  createHash("sha256").update(content.trim()).digest("hex");

const toVectorLiteral = (embedding: number[]): string =>
  `[${embedding.map((value) => Number(value).toString()).join(",")}]`;

export class JudgeReferenceChunkRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async findNearest(
    input: FindNearestReferenceChunksInput,
  ): Promise<ReferenceChunkMatch[]> {
    const result = await this.database.query<{
      chunk_type: JudgeReferenceChunkType;
      content: string;
      criterion_id: string;
      metadata: Record<string, unknown>;
      problem_id: string;
      rubric_version: string;
      similarity_score: number;
      stage_id: StageId;
    }>(
      `
        select
          problem_id,
          stage_id,
          rubric_version,
          criterion_id,
          chunk_type,
          content,
          metadata,
          1 - (embedding <=> $5::vector) as similarity_score
        from judge_reference_chunks
        where problem_id = $1
          and stage_id = $2
          and ($3::text is null or rubric_version = $3)
          and ($4::text[] is null or chunk_type = any($4::text[]))
        order by embedding <=> $5::vector
        limit $6
      `,
      [
        input.problemId,
        input.stageId,
        input.rubricVersion ?? null,
        input.chunkTypes ?? null,
        toVectorLiteral(input.embedding),
        input.limit ?? 8,
      ],
    );

    return result.rows.map((row) => ({
      chunkType: row.chunk_type,
      content: row.content,
      criterionId: row.criterion_id,
      metadata: row.metadata,
      problemId: row.problem_id,
      rubricVersion: row.rubric_version,
      similarityScore: Number(row.similarity_score),
      stageId: row.stage_id,
    }));
  }

  async upsertMany(inputs: UpsertReferenceChunkInput[]): Promise<number> {
    let upsertedCount = 0;

    for (const input of inputs) {
      await this.upsert(input);
      upsertedCount += 1;
    }

    return upsertedCount;
  }

  async replaceAll(inputs: UpsertReferenceChunkInput[]): Promise<number> {
    await this.database.withTransaction(async (client) => {
      await client.query("delete from judge_reference_chunks");

      for (const input of inputs) {
        await this.upsert(input, client);
      }
    });

    return inputs.length;
  }

  private async upsert(
    input: UpsertReferenceChunkInput,
    client: SqlClient = this.database,
  ): Promise<void> {
    await client.query(
      `
        insert into judge_reference_chunks (
          problem_id,
          stage_id,
          criterion_id,
          chunk_type,
          content,
          content_hash,
          embedding_model,
          embedding_dimensions,
          embedding,
          rubric_version,
          metadata
        )
        values (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9::vector,
          $10,
          $11::jsonb
        )
        on conflict (
          problem_id,
          stage_id,
          rubric_version,
          criterion_id,
          chunk_type,
          content_hash
        )
        do update set
          content = excluded.content,
          embedding_model = excluded.embedding_model,
          embedding_dimensions = excluded.embedding_dimensions,
          embedding = excluded.embedding,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        input.problemId,
        input.stageId,
        input.criterionId,
        input.chunkType satisfies JudgeReferenceChunkType,
        input.content.trim(),
        hashContent(input.content),
        input.embeddingModel,
        input.embeddingDimensions,
        toVectorLiteral(input.embedding),
        input.rubricVersion,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
