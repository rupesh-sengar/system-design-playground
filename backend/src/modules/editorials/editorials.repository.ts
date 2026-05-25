import type { QueryResultRow } from "pg";
import type { PostgresDatabase } from "../../database/postgres.js";
import type { StageId } from "../ai/contracts.js";
import type { UpsertStageEditorialInput } from "./contracts.js";

type IsoDateValue = Date | string;

export interface StageEditorialRecord {
  contentHtml: string;
  createdAt: string;
  problemId: string;
  stageId: StageId;
  title: string;
  updatedAt: string;
}

export interface UpsertStageEditorialSeedInput {
  contentHtml: string;
  problemId: string;
  stageId: StageId;
  title: string;
}

const getRequiredRow = <Row>(row: Row | undefined, message: string): Row => {
  if (!row) {
    throw new Error(message);
  }

  return row;
};

const toIsoString = (value: IsoDateValue): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

const mapStageEditorialRecord = (
  row: QueryResultRow & {
    content_html: string;
    created_at: IsoDateValue;
    problem_id: string;
    stage_id: StageId;
    title: string;
    updated_at: IsoDateValue;
  },
): StageEditorialRecord => ({
  contentHtml: row.content_html,
  createdAt: toIsoString(row.created_at),
  problemId: row.problem_id,
  stageId: row.stage_id,
  title: row.title,
  updatedAt: toIsoString(row.updated_at),
});

export class StageEditorialRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async findByProblemIdAndStageId(
    problemId: string,
    stageId: StageId,
  ): Promise<StageEditorialRecord | null> {
    const result = await this.database.query<{
      content_html: string;
      created_at: IsoDateValue;
      problem_id: string;
      stage_id: StageId;
      title: string;
      updated_at: IsoDateValue;
    }>(
      `
        select
          problem_id,
          stage_id,
          title,
          content_html,
          created_at,
          updated_at
        from stage_editorials
        where problem_id = $1
          and stage_id = $2
      `,
      [problemId, stageId],
    );

    return result.rows[0] ? mapStageEditorialRecord(result.rows[0]) : null;
  }

  async upsert(
    problemId: string,
    stageId: StageId,
    input: UpsertStageEditorialInput,
    userId: string,
  ): Promise<StageEditorialRecord> {
    const result = await this.database.query<{
      content_html: string;
      created_at: IsoDateValue;
      problem_id: string;
      stage_id: StageId;
      title: string;
      updated_at: IsoDateValue;
    }>(
      `
        insert into stage_editorials (
          problem_id,
          stage_id,
          title,
          content_html,
          created_by_user_id,
          updated_by_user_id
        )
        values ($1, $2, $3, $4, $5, $5)
        on conflict (problem_id, stage_id)
        do update set
          title = excluded.title,
          content_html = excluded.content_html,
          updated_by_user_id = excluded.updated_by_user_id,
          updated_at = now()
        returning
          problem_id,
          stage_id,
          title,
          content_html,
          created_at,
          updated_at
      `,
      [problemId, stageId, input.title ?? "", input.contentHtml, userId],
    );

    return mapStageEditorialRecord(
      getRequiredRow(result.rows[0], "Stage editorial upsert returned no row."),
    );
  }

  async upsertSystemSeeds(
    inputs: UpsertStageEditorialSeedInput[],
  ): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    return this.database.withTransaction(async (client) => {
      let upsertedCount = 0;

      for (const input of inputs) {
        const result = await client.query(
          `
            insert into stage_editorials (
              problem_id,
              stage_id,
              title,
              content_html
            )
            values ($1, $2, $3, $4)
            on conflict (problem_id, stage_id)
            do update set
              title = excluded.title,
              content_html = excluded.content_html,
              updated_at = now()
          `,
          [
            input.problemId,
            input.stageId,
            input.title,
            input.contentHtml,
          ],
        );

        upsertedCount += result.rowCount ?? 0;
      }

      return upsertedCount;
    });
  }
}
