import { requestJson } from "@/shared/api/http";
import type {
  PracticeProblem,
  PracticeStageId,
  PracticeStageHintResult,
  PracticeStageValidationResult,
} from "../model/types";

export interface AiProviderMeta {
  configured: boolean;
  model: string;
  orchestration: "google-adk";
  provider: "gemini";
}

type ProblemPayload = {
  category: string;
  focusAreas: string[];
  id: string;
  interviewVariants: string[];
  pitfalls: string[];
  scale: string;
  summary: string;
  title: string;
};

type HintResponseEnvelope = {
  data: Omit<PracticeStageHintResult, "meta" | "receivedAt" | "sourceDraft">;
  meta: AiProviderMeta;
};

type ValidationResponseEnvelope = {
  data: Omit<
    PracticeStageValidationResult,
    "meta" | "receivedAt" | "sourceDraft"
  >;
  meta: AiProviderMeta;
};

const toProblemPayload = (problem: PracticeProblem): ProblemPayload => ({
  category: problem.category,
  focusAreas: problem.focusAreas,
  id: problem.id,
  interviewVariants: problem.interviewVariants,
  pitfalls: problem.pitfalls,
  scale: problem.scale,
  summary: problem.summary,
  title: problem.title,
});

export const generateStageHints = async ({
  currentDraft,
  maxHints = 3,
  problem,
  stageId,
}: {
  currentDraft: string;
  maxHints?: number;
  problem: PracticeProblem;
  stageId: PracticeStageId;
}): Promise<HintResponseEnvelope> =>
  requestJson("/v1/ai/generate-hints", {
    method: "POST",
    requiresAuth: true,
    body: JSON.stringify({
      currentDraft,
      maxHints,
      problem: toProblemPayload(problem),
      stageId,
    }),
  });

export const validateStageDraft = async ({
  problem,
  stageId,
  submission,
}: {
  problem: PracticeProblem;
  stageId: PracticeStageId;
  submission: string;
}): Promise<ValidationResponseEnvelope> =>
  requestJson("/v1/ai/validate-design", {
    method: "POST",
    requiresAuth: true,
    body: JSON.stringify({
      constraints: [problem.scale],
      problem: toProblemPayload(problem),
      requirements: [],
      stageId,
      submission,
    }),
  });
