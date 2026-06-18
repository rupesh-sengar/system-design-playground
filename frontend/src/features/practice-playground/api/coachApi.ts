import { baseApi } from "@/shared/api/baseApi";
import { getApiErrorDetails, requestJson } from "@/shared/api/http";
import type {
  PracticeProblem,
  PracticeFullDesignReviewResult,
  PracticeStageHintResult,
  PracticeStageId,
  PracticeStageValidationResult,
} from "../model/types";

export interface AiProviderMeta {
  configured: boolean;
  model?: string;
  orchestration: "openai-compatible" | "rule-engine";
  provider: "deepseek" | "rule-engine";
  rubricVersion?: string;
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

type FullDesignReviewResponseEnvelope = {
  data: Omit<
    PracticeFullDesignReviewResult,
    "meta" | "receivedAt" | "sourceDraft"
  >;
  meta: AiProviderMeta;
};

type RtkQueryCustomError = {
  error: string;
  data: {
    error: string;
    kind: ReturnType<typeof getApiErrorDetails>["kind"];
    retryable: boolean;
    statusCode: number | null;
  };
  status: "CUSTOM_ERROR";
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

const toQueryError = (
  error: unknown,
  fallbackMessage: string,
): RtkQueryCustomError => {
  const details = getApiErrorDetails(error, fallbackMessage);

  return {
    error: details.message,
    data: {
      error: details.message,
      kind: details.kind,
      retryable: details.retryable,
      statusCode: details.statusCode,
    },
    status: "CUSTOM_ERROR",
  };
};

export const coachApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateStageHints: builder.mutation<
      HintResponseEnvelope,
      {
        currentDraft: string;
        maxHints?: number;
        problem: PracticeProblem;
        stageId: PracticeStageId;
      }
    >({
      queryFn: async ({ currentDraft, maxHints = 3, problem, stageId }) => {
        try {
          const data = await requestJson<HintResponseEnvelope>(
            "/v1/ai/generate-hints",
            {
              method: "POST",
              requiresAuth: true,
              body: JSON.stringify({
                currentDraft,
                maxHints,
                problem: toProblemPayload(problem),
                stageId,
              }),
            },
          );

          return { data };
        } catch (error) {
          return {
            error: toQueryError(error, "Unable to generate hints right now."),
          };
        }
      },
    }),
    validateStageDraft: builder.mutation<
      ValidationResponseEnvelope,
      {
        problem: PracticeProblem;
        stageId: PracticeStageId;
        submission: string;
      }
    >({
      queryFn: async ({ problem, stageId, submission }) => {
        try {
          const data = await requestJson<ValidationResponseEnvelope>(
            "/v1/ai/validate-design",
            {
              method: "POST",
              requiresAuth: true,
              body: JSON.stringify({
                constraints: [problem.scale],
                problem: toProblemPayload(problem),
                requirements: [],
                stageId,
                submission,
              }),
            },
          );

          return { data };
        } catch (error) {
          return {
            error: toQueryError(
              error,
              "Unable to validate this draft right now.",
            ),
          };
        }
      },
    }),
    reviewFullDesign: builder.mutation<
      FullDesignReviewResponseEnvelope,
      {
        problem: PracticeProblem;
        stages: Array<{
          stageId: PracticeStageId;
          stageTitle: string;
          submission: string;
        }>;
      }
    >({
      queryFn: async ({ problem, stages }) => {
        try {
          const data = await requestJson<FullDesignReviewResponseEnvelope>(
            "/v1/ai/review-full-design",
            {
              body: JSON.stringify({
                problem: toProblemPayload(problem),
                stages,
              }),
              method: "POST",
              requiresAuth: true,
              timeoutMs: 60_000,
            },
          );

          return { data };
        } catch (error) {
          return {
            error: toQueryError(
              error,
              "Unable to review the full design right now.",
            ),
          };
        }
      },
    }),
  }),
});

export const {
  useGenerateStageHintsMutation,
  useReviewFullDesignMutation,
  useValidateStageDraftMutation,
} = coachApi;
