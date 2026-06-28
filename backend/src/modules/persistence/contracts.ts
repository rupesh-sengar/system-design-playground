import { z } from "zod";
import {
  generateHintsResponseSchema,
  stageIdSchema,
  validateDesignResponseSchema,
} from "../ai/contracts.js";
import { systemDesignDiagramSchema } from "../../shared/system-design-diagram.js";

export const problemIdParamsSchema = z.object({
  problemId: z.string().trim().min(1),
});

export const updateProblemProgressSchema = z
  .object({
    isBookmarked: z.boolean().optional(),
    isPracticed: z.boolean().optional(),
    isStarted: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.isBookmarked !== undefined ||
      value.isPracticed !== undefined ||
      value.isStarted !== undefined,
    {
      message: "At least one progress field must be provided.",
      path: ["isStarted"],
    },
  );

const nullableProfileStringSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value ? value : null))
    .nullable()
    .optional();

export const appUserProfileSchema = z.object({
  displayName: nullableProfileStringSchema(160),
  email: nullableProfileStringSchema(320),
  pictureUrl: nullableProfileStringSchema(2048),
  username: nullableProfileStringSchema(160),
});

const aiProviderMetaSchema = z.discriminatedUnion("provider", [
  z.object({
    configured: z.boolean(),
    model: z.string().optional(),
    orchestration: z.literal("openai-compatible"),
    provider: z.literal("deepseek"),
  }),
  z.object({
    configured: z.boolean(),
    orchestration: z.literal("rule-engine"),
    provider: z.literal("rule-engine"),
    rubricVersion: z.string().optional(),
  }),
]);

const persistedHintResultSchema = generateHintsResponseSchema.extend({
  meta: aiProviderMetaSchema,
  receivedAt: z.string().datetime(),
  sourceDraft: z.string(),
});

const persistedValidationResultSchema = validateDesignResponseSchema.extend({
  meta: aiProviderMetaSchema,
  receivedAt: z.string().datetime(),
  sourceDraft: z.string(),
});

const practiceStageDraftSchema = z.object({
  diagramJson: systemDesignDiagramSchema.nullable().optional(),
  hintResult: persistedHintResultSchema.nullable().optional(),
  isComplete: z.boolean(),
  notesHtml: z.string(),
  updatedAt: z.string().datetime().nullable().optional(),
  validationResult: persistedValidationResultSchema.nullable().optional(),
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
export type AppUserProfileInput = z.infer<typeof appUserProfileSchema>;
export type UpsertPracticeSessionInput = z.infer<
  typeof upsertPracticeSessionSchema
>;
