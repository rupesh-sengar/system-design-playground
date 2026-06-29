import type { QueryResultRow } from "pg";
import type { PostgresDatabase } from "../../database/postgres.js";
import type {
  CreateIssueReportInput,
  IssueReportCategory,
  IssueReportStatus,
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

export interface IssueReportRecord {
  browserContext: Record<string, unknown>;
  category: IssueReportCategory;
  createdAt: string;
  description: string;
  id: string;
  pagePath: string | null;
  reporterEmail: string | null;
  reporterName: string | null;
  reporterUserId: string | null;
  status: IssueReportStatus;
  title: string;
  updatedAt: string;
}

type IssueReportRow = QueryResultRow & {
  browser_context: Record<string, unknown> | null;
  category: IssueReportCategory;
  created_at: IsoDateValue;
  description: string;
  id: string;
  page_path: string | null;
  reporter_email: string | null;
  reporter_name: string | null;
  reporter_user_id: string | null;
  status: IssueReportStatus;
  title: string;
  updated_at: IsoDateValue;
};

const mapIssueReportRecord = (row: IssueReportRow): IssueReportRecord => ({
  browserContext: row.browser_context ?? {},
  category: row.category,
  createdAt: toIsoString(row.created_at),
  description: row.description,
  id: row.id,
  pagePath: row.page_path,
  reporterEmail: row.reporter_email,
  reporterName: row.reporter_name,
  reporterUserId: row.reporter_user_id,
  status: row.status,
  title: row.title,
  updatedAt: toIsoString(row.updated_at),
});

export class IssueReportRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async create(
    input: CreateIssueReportInput & {
      browserContext: Record<string, unknown>;
      reporterUserId?: string | null;
    },
  ): Promise<IssueReportRecord> {
    const result = await this.database.query<IssueReportRow>(
      `
        insert into issue_reports (
          reporter_user_id,
          reporter_name,
          reporter_email,
          category,
          title,
          description,
          page_path,
          browser_context
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning
          id,
          reporter_user_id,
          reporter_name,
          reporter_email,
          category,
          title,
          description,
          page_path,
          browser_context,
          status,
          created_at,
          updated_at
      `,
      [
        input.reporterUserId ?? null,
        input.reporterName ?? null,
        input.reporterEmail ?? null,
        input.category,
        input.title,
        input.description,
        input.pagePath ?? null,
        input.browserContext,
      ],
    );

    return mapIssueReportRecord(
      getRequiredRow(result.rows[0], "Issue report insert returned no row."),
    );
  }
}
