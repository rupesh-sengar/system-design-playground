import { z } from "zod";

export const stageIds = [
  "requirements",
  "core-entities",
  "api-interface",
  "data-flow",
  "high-level-design",
  "deep-dives",
] as const;

export const stageIdSchema = z.enum(stageIds);

export const problemContextSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  scale: z.string().min(1),
  category: z.string().min(1),
  focusAreas: z.array(z.string().min(1)).default([]),
  pitfalls: z.array(z.string().min(1)).default([]),
  interviewVariants: z.array(z.string().min(1)).default([]),
});

export const validateDesignRequestSchema = z.object({
  problem: problemContextSchema,
  submission: z.string().min(20, "submission should be at least 20 characters"),
  stageId: stageIdSchema.optional(),
  requirements: z.array(z.string().min(1)).default([]),
  constraints: z.array(z.string().min(1)).default([]),
});

export const rubricCoverageItemSchema = z.object({
  criterion: z.string().min(1),
  notes: z.string().min(1),
  status: z.enum(["strong", "partial", "missing"]),
});

export const validateDesignResponseSchema = z.object({
  confidence: z.enum(["low", "medium", "high"]),
  followUpQuestions: z.array(z.string().min(1)).default([]),
  gaps: z.array(z.string().min(1)).default([]),
  incorrectAssumptions: z.array(z.string().min(1)).default([]),
  missedRequirements: z.array(z.string().min(1)).default([]),
  nextIterationPlan: z.array(z.string().min(1)).default([]),
  rubricCoverage: z.array(rubricCoverageItemSchema).default([]),
  score: z.number().min(0).max(10),
  strengths: z.array(z.string().min(1)).default([]),
  summary: z.string().min(1),
});

export const generateHintsRequestSchema = z.object({
  currentDraft: z.string().min(1),
  maxHints: z.coerce.number().int().min(1).max(5).default(3),
  problem: problemContextSchema,
  stageId: stageIdSchema,
});

export const generateHintsResponseSchema = z.object({
  caution: z.string().nullable(),
  focusAreas: z.array(z.string().min(1)).default([]),
  hints: z.array(z.string().min(1)).min(1).max(5),
  nextQuestion: z.string().min(1),
});

export type StageId = z.infer<typeof stageIdSchema>;
export type ProblemContext = z.infer<typeof problemContextSchema>;
export type ValidateDesignRequest = z.infer<typeof validateDesignRequestSchema>;
export type ValidateDesignResponse = z.infer<typeof validateDesignResponseSchema>;
export type GenerateHintsRequest = z.infer<typeof generateHintsRequestSchema>;
export type GenerateHintsResponse = z.infer<typeof generateHintsResponseSchema>;
