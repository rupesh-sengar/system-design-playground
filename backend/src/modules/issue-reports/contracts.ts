import { z } from "zod";

const nullableTrimmedStringSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value ? value : null))
    .nullable()
    .optional();

const nullableEmailSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue ? trimmedValue : null;
  },
  z.string().email().max(320).nullable().optional(),
);

export const issueReportCategorySchema = z.enum([
  "bug",
  "content",
  "billing",
  "usability",
  "performance",
  "other",
]);

export const issueReportStatusSchema = z.enum(["open", "triaged", "closed"]);

export const createIssueReportSchema = z.object({
  browserContext: z.record(z.unknown()).optional(),
  category: issueReportCategorySchema.default("bug"),
  description: z.string().trim().min(10).max(4000),
  pagePath: nullableTrimmedStringSchema(2048),
  reporterEmail: nullableEmailSchema,
  reporterName: nullableTrimmedStringSchema(160),
  title: z.string().trim().min(3).max(160),
});

export type CreateIssueReportInput = z.infer<
  typeof createIssueReportSchema
>;

export type IssueReportCategory = z.infer<typeof issueReportCategorySchema>;
export type IssueReportStatus = z.infer<typeof issueReportStatusSchema>;
