import { requestJson } from "@/shared/api/http";

export type IssueReportCategory =
  | "bug"
  | "content"
  | "billing"
  | "usability"
  | "performance"
  | "other";

export interface CreateIssueReportInput {
  browserContext?: Record<string, unknown>;
  category: IssueReportCategory;
  description: string;
  pagePath?: string | null;
  reporterEmail?: string | null;
  reporterName?: string | null;
  title: string;
}

export interface CreatedIssueReport {
  createdAt: string;
  id: string;
  status: "open" | "triaged" | "closed";
}

type CreatedIssueReportEnvelope = {
  data: CreatedIssueReport;
};

export const createIssueReport = async (
  input: CreateIssueReportInput,
): Promise<CreatedIssueReport> => {
  const response = await requestJson<CreatedIssueReportEnvelope>(
    "/v1/issue-reports",
    {
      body: JSON.stringify(input),
      method: "POST",
    },
  );

  return response.data;
};
