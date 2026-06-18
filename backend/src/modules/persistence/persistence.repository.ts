import type { QueryResultRow } from "pg";
import type { PostgresDatabase, SqlClient } from "../../database/postgres.js";
import { stageIds, type StageId } from "../ai/contracts.js";
import type {
  UpdateProblemProgressInput,
  UpsertPracticeSessionInput,
} from "./contracts.js";

type IsoDateValue = Date | string | null;

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

  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  throw new Error("Expected timestamp value.");
};

const toNullableIsoString = (value: IsoDateValue): string | null => {
  return value === null ? null : toIsoString(value);
};

export interface AppUserRecord {
  authProvider: string;
  authSubject: string;
  createdAt: string;
  displayName: string | null;
  email: string | null;
  id: string;
  lastSeenAt: string;
  pictureUrl: string | null;
  updatedAt: string;
  username: string | null;
}

export interface ProblemProgressRecord {
  createdAt: string;
  isBookmarked: boolean;
  isPracticed: boolean;
  problemId: string;
  updatedAt: string;
}

export interface PracticeStageDraftRecord {
  diagramJson: unknown | null;
  hintResult: unknown | null;
  isComplete: boolean;
  notesHtml: string;
  updatedAt: string | null;
  validationResult: unknown | null;
}

export type PracticeStageDraftRecordMap = Record<
  StageId,
  PracticeStageDraftRecord
>;

export interface PracticeSessionRecord {
  activeStageId: StageId;
  problemId: string;
  stages: PracticeStageDraftRecordMap;
  updatedAt: string;
}

const createEmptyPracticeStageDrafts = (): PracticeStageDraftRecordMap =>
  stageIds.reduce<PracticeStageDraftRecordMap>((drafts, stageId) => {
    drafts[stageId] = {
      diagramJson: null,
      hintResult: null,
      isComplete: false,
      notesHtml: "",
      updatedAt: null,
      validationResult: null,
    };

    return drafts;
  }, {} as PracticeStageDraftRecordMap);

const mapAppUserRecord = (
  row: QueryResultRow & {
    auth_provider: string;
    auth_subject: string;
    created_at: IsoDateValue;
    display_name: string | null;
    email: string | null;
    id: string;
    last_seen_at: IsoDateValue;
    picture_url: string | null;
    updated_at: IsoDateValue;
    username: string | null;
  },
): AppUserRecord => ({
  authProvider: row.auth_provider,
  authSubject: row.auth_subject,
  createdAt: toIsoString(row.created_at),
  displayName: row.display_name,
  email: row.email,
  id: row.id,
  lastSeenAt: toIsoString(row.last_seen_at),
  pictureUrl: row.picture_url,
  updatedAt: toIsoString(row.updated_at),
  username: row.username,
});

const mapProblemProgressRecord = (
  row: QueryResultRow & {
    created_at: IsoDateValue;
    is_bookmarked: boolean;
    is_practiced: boolean;
    problem_id: string;
    updated_at: IsoDateValue;
  },
): ProblemProgressRecord => ({
  createdAt: toIsoString(row.created_at),
  isBookmarked: row.is_bookmarked,
  isPracticed: row.is_practiced,
  problemId: row.problem_id,
  updatedAt: toIsoString(row.updated_at),
});

export class AppUserRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async upsertByAuthIdentity(input: {
    authProvider: string;
    authSubject: string;
    displayName: string | null;
    email: string | null;
    pictureUrl: string | null;
    username: string | null;
  }): Promise<AppUserRecord> {
    const result = await this.database.query<{
      auth_provider: string;
      auth_subject: string;
      created_at: IsoDateValue;
      display_name: string | null;
      email: string | null;
      id: string;
      last_seen_at: IsoDateValue;
      picture_url: string | null;
      updated_at: IsoDateValue;
      username: string | null;
    }>(
      `
        insert into app_users (
          auth_provider,
          auth_subject,
          email,
          display_name,
          username,
          picture_url,
          last_seen_at
        )
        values ($1, $2, $3, $4, $5, $6, now())
        on conflict (auth_provider, auth_subject)
        do update set
          email = coalesce(excluded.email, app_users.email),
          display_name = coalesce(excluded.display_name, app_users.display_name),
          username = coalesce(excluded.username, app_users.username),
          picture_url = coalesce(excluded.picture_url, app_users.picture_url),
          last_seen_at = now(),
          updated_at = now()
        returning
          id,
          auth_provider,
          auth_subject,
          email,
          display_name,
          username,
          picture_url,
          last_seen_at,
          created_at,
          updated_at
      `,
      [
        input.authProvider,
        input.authSubject,
        input.email,
        input.displayName,
        input.username,
        input.pictureUrl,
      ],
    );

    return mapAppUserRecord(
      getRequiredRow(result.rows[0], "App user upsert returned no row."),
    );
  }

  async updateProfile(
    userId: string,
    input: {
      displayName?: string | null | undefined;
      email?: string | null | undefined;
      pictureUrl?: string | null | undefined;
      username?: string | null | undefined;
    },
  ): Promise<AppUserRecord> {
    const result = await this.database.query<{
      auth_provider: string;
      auth_subject: string;
      created_at: IsoDateValue;
      display_name: string | null;
      email: string | null;
      id: string;
      last_seen_at: IsoDateValue;
      picture_url: string | null;
      updated_at: IsoDateValue;
      username: string | null;
    }>(
      `
        update app_users
        set
          email = coalesce($2, email),
          display_name = coalesce($3, display_name),
          username = coalesce($4, username),
          picture_url = coalesce($5, picture_url),
          last_seen_at = now(),
          updated_at = now()
        where id = $1
        returning
          id,
          auth_provider,
          auth_subject,
          email,
          display_name,
          username,
          picture_url,
          last_seen_at,
          created_at,
          updated_at
      `,
      [
        userId,
        input.email ?? null,
        input.displayName ?? null,
        input.username ?? null,
        input.pictureUrl ?? null,
      ],
    );

    return mapAppUserRecord(
      getRequiredRow(result.rows[0], "App user profile update returned no row."),
    );
  }
}

export class ProblemProgressRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async listByUserId(userId: string): Promise<ProblemProgressRecord[]> {
    const result = await this.database.query<{
      created_at: IsoDateValue;
      is_bookmarked: boolean;
      is_practiced: boolean;
      problem_id: string;
      updated_at: IsoDateValue;
    }>(
      `
        select
          problem_id,
          is_bookmarked,
          is_practiced,
          created_at,
          updated_at
        from user_problem_progress
        where user_id = $1
        order by updated_at desc
      `,
      [userId],
    );

    return result.rows.map(mapProblemProgressRecord);
  }

  async upsert(
    userId: string,
    problemId: string,
    input: UpdateProblemProgressInput,
  ): Promise<ProblemProgressRecord> {
    const result = await this.database.query<{
      created_at: IsoDateValue;
      is_bookmarked: boolean;
      is_practiced: boolean;
      problem_id: string;
      updated_at: IsoDateValue;
    }>(
      `
        insert into user_problem_progress (
          user_id,
          problem_id,
          is_bookmarked,
          is_practiced
        )
        values ($1, $2, coalesce($3, false), coalesce($4, false))
        on conflict (user_id, problem_id)
        do update set
          is_bookmarked = coalesce($3, user_problem_progress.is_bookmarked),
          is_practiced = coalesce($4, user_problem_progress.is_practiced),
          updated_at = now()
        returning
          problem_id,
          is_bookmarked,
          is_practiced,
          created_at,
          updated_at
      `,
      [userId, problemId, input.isBookmarked ?? null, input.isPracticed ?? null],
    );

    const progressRecord = mapProblemProgressRecord(
      getRequiredRow(
        result.rows[0],
        "Problem progress upsert returned no row.",
      ),
    );

    if (!progressRecord.isBookmarked && !progressRecord.isPracticed) {
      await this.database.query(
        `
          delete from user_problem_progress
          where user_id = $1
            and problem_id = $2
        `,
        [userId, problemId],
      );
    }

    return progressRecord;
  }

  async resetForUser(userId: string): Promise<void> {
    await this.database.query(
      `
        delete from user_problem_progress
        where user_id = $1
      `,
      [userId],
    );
  }
}

type PracticeSessionQueryRow = QueryResultRow & {
  active_stage_id: StageId;
  problem_id: string;
  session_updated_at: IsoDateValue;
  stage_id: StageId | null;
  stage_diagram_json: unknown | null;
  stage_hint_result: unknown | null;
  stage_is_complete: boolean | null;
  stage_notes_html: string | null;
  stage_updated_at: IsoDateValue;
  stage_validation_result: unknown | null;
};

const mapPracticeSessionRecord = (
  rows: PracticeSessionQueryRow[],
): PracticeSessionRecord | null => {
  const firstRow = rows[0];

  if (!firstRow) {
    return null;
  }

  const stages = createEmptyPracticeStageDrafts();

  for (const row of rows) {
    if (!row.stage_id) {
      continue;
    }

    stages[row.stage_id] = {
      diagramJson: row.stage_diagram_json ?? null,
      hintResult: row.stage_hint_result ?? null,
      isComplete: row.stage_is_complete ?? false,
      notesHtml: row.stage_notes_html ?? "",
      updatedAt: toNullableIsoString(row.stage_updated_at),
      validationResult: row.stage_validation_result ?? null,
    };
  }

  return {
    activeStageId: firstRow.active_stage_id,
    problemId: firstRow.problem_id,
    stages,
    updatedAt: toIsoString(firstRow.session_updated_at),
  };
};

export class PracticeSessionRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async findByUserIdAndProblemId(
    userId: string,
    problemId: string,
  ): Promise<PracticeSessionRecord | null> {
    const result = await this.database.query<PracticeSessionQueryRow>(
      `
        select
          ps.problem_id,
          ps.active_stage_id,
          ps.updated_at as session_updated_at,
          psd.stage_id,
          psd.diagram_json as stage_diagram_json,
          psd.ai_hint_result as stage_hint_result,
          psd.notes_html as stage_notes_html,
          psd.is_complete as stage_is_complete,
          psd.updated_at as stage_updated_at,
          psd.ai_validation_result as stage_validation_result
        from practice_sessions ps
        left join practice_stage_drafts psd
          on psd.session_id = ps.id
        where ps.user_id = $1
          and ps.problem_id = $2
        order by psd.created_at asc nulls last
      `,
      [userId, problemId],
    );

    return mapPracticeSessionRecord(result.rows);
  }

  async upsert(
    userId: string,
    problemId: string,
    input: UpsertPracticeSessionInput,
  ): Promise<PracticeSessionRecord> {
    return this.database.withTransaction(async (client) => {
      const sessionResult = await client.query<{
        active_stage_id: StageId;
        id: string;
        problem_id: string;
        updated_at: IsoDateValue;
      }>(
        `
          insert into practice_sessions (
            user_id,
            problem_id,
            active_stage_id
          )
          values ($1, $2, $3)
          on conflict (user_id, problem_id)
          do update set
            active_stage_id = excluded.active_stage_id,
            updated_at = now()
          returning
            id,
            problem_id,
            active_stage_id,
            updated_at
        `,
        [userId, problemId, input.activeStageId],
      );
      const sessionRow = getRequiredRow(
        sessionResult.rows[0],
        "Practice session upsert returned no row.",
      );

      for (const stageId of stageIds) {
        const stageDraft = input.stages[stageId];

        await client.query(
          `
            insert into practice_stage_drafts (
              session_id,
              stage_id,
              diagram_json,
              ai_hint_result,
              notes_html,
              is_complete,
              updated_at,
              ai_validation_result
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            on conflict (session_id, stage_id)
            do update set
              diagram_json = excluded.diagram_json,
              ai_hint_result = excluded.ai_hint_result,
              notes_html = excluded.notes_html,
              is_complete = excluded.is_complete,
              updated_at = excluded.updated_at,
              ai_validation_result = excluded.ai_validation_result
          `,
          [
            sessionRow.id,
            stageId,
            stageDraft.diagramJson ?? null,
            stageDraft.hintResult ?? null,
            stageDraft.notesHtml,
            stageDraft.isComplete,
            stageDraft.updatedAt ?? null,
            stageDraft.validationResult ?? null,
          ],
        );
      }

      const storedSession = await this.findByUserIdAndProblemIdWithClient(
        client,
        userId,
        problemId,
      );

      if (!storedSession) {
        throw new Error("Saved practice session could not be loaded.");
      }

      return storedSession;
    });
  }

  async reset(userId: string, problemId: string): Promise<void> {
    await this.database.query(
      `
        delete from practice_sessions
        where user_id = $1
          and problem_id = $2
      `,
      [userId, problemId],
    );
  }

  private async findByUserIdAndProblemIdWithClient(
    client: SqlClient,
    userId: string,
    problemId: string,
  ): Promise<PracticeSessionRecord | null> {
    const result = await client.query<PracticeSessionQueryRow>(
      `
        select
          ps.problem_id,
          ps.active_stage_id,
          ps.updated_at as session_updated_at,
          psd.stage_id,
          psd.diagram_json as stage_diagram_json,
          psd.ai_hint_result as stage_hint_result,
          psd.notes_html as stage_notes_html,
          psd.is_complete as stage_is_complete,
          psd.updated_at as stage_updated_at,
          psd.ai_validation_result as stage_validation_result
        from practice_sessions ps
        left join practice_stage_drafts psd
          on psd.session_id = ps.id
        where ps.user_id = $1
          and ps.problem_id = $2
        order by psd.created_at asc nulls last
      `,
      [userId, problemId],
    );

    return mapPracticeSessionRecord(result.rows);
  }
}
