import { z } from "zod";
import {
  generateHintsResponseSchema,
  stageIdSchema,
  validateDesignResponseSchema,
} from "../ai/contracts.js";

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

const systemDesignNodeKindSchema = z.enum([
  "dns",
  "client",
  "cdn",
  "firewall",
  "load-balancer",
  "api-gateway",
  "auth",
  "rate-limiter",
  "service",
  "service-discovery",
  "database",
  "cache",
  "queue",
  "stream",
  "worker",
  "scheduler",
  "search",
  "storage",
  "monitoring",
  "external",
]);

const systemDesignConnectorKindSchema = z.enum([
  "one-way",
  "async",
  "bidirectional",
  "dependency",
  "plain",
]);

const systemDesignDiagramSchema = z.object({
  connectors: z
    .array(
      z.object({
        fromNodeId: z.string().trim().min(1),
        id: z.string().trim().min(1),
        kind: systemDesignConnectorKindSchema,
        label: z.string().max(80),
        toNodeId: z.string().trim().min(1),
      }),
    )
    .max(200),
  nodes: z
    .array(
      z.object({
        height: z.number().finite().min(52).max(180),
        id: z.string().trim().min(1),
        kind: systemDesignNodeKindSchema,
        label: z.string().trim().min(1).max(80),
        width: z.number().finite().min(104).max(260),
        x: z.number().finite().min(-100000).max(100000),
        y: z.number().finite().min(-100000).max(100000),
      }),
    )
    .max(100),
  viewport: z
    .object({
      height: z.number().finite().min(100).max(100000),
      width: z.number().finite().min(100).max(100000),
      x: z.number().finite().min(-100000).max(100000),
      y: z.number().finite().min(-100000).max(100000),
    })
    .nullable()
    .optional(),
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
