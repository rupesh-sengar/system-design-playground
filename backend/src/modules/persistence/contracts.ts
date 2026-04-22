import { z } from "zod";
import { stageIdSchema } from "../ai/contracts.js";

export const problemIdParamsSchema = z.object({
  problemId: z.string().trim().min(1),
});

export const updateProblemProgressSchema = z
  .object({
    isBookmarked: z.boolean().optional(),
    isPracticed: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.isBookmarked !== undefined || value.isPracticed !== undefined,
    {
      message: "At least one progress field must be provided.",
      path: ["isBookmarked"],
    },
  );

const practiceStageDraftSchema = z.object({
  isComplete: z.boolean(),
  notesHtml: z.string(),
  updatedAt: z.string().datetime().nullable().optional(),
});

export const upsertPracticeSessionSchema = z.object({
  activeStageId: stageIdSchema,
  stages: z.object({
    requirements: practiceStageDraftSchema,
    "core-entities": practiceStageDraftSchema,
    "api-interface": practiceStageDraftSchema,
    "data-flow": practiceStageDraftSchema,
    "high-level-design": practiceStageDraftSchema,
    "deep-dives": practiceStageDraftSchema,
  }),
});

export type ProblemIdParams = z.infer<typeof problemIdParamsSchema>;
export type UpdateProblemProgressInput = z.infer<
  typeof updateProblemProgressSchema
>;
export type UpsertPracticeSessionInput = z.infer<
  typeof upsertPracticeSessionSchema
>;
