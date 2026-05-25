import { z } from "zod";
import { stageIdSchema } from "../ai/contracts.js";

export const stageEditorialParamsSchema = z.object({
  problemId: z.string().trim().min(1),
  stageId: stageIdSchema,
});

export const upsertStageEditorialSchema = z.object({
  contentHtml: z.string().min(1).max(100_000),
  title: z.string().trim().max(160).optional(),
});

export type StageEditorialParams = z.infer<
  typeof stageEditorialParamsSchema
>;
export type UpsertStageEditorialInput = z.infer<
  typeof upsertStageEditorialSchema
>;
