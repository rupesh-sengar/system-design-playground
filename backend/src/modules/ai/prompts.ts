import type {
  GenerateHintsRequest,
  ReviewFullDesignRequest,
  StageId,
  ValidateDesignRequest,
} from "./contracts.js";
import { getStageRubric } from "./stage-rubrics.js";

const validationJsonContract = `{
  "score": number,
  "summary": string,
  "strengths": string[],
  "gaps": string[],
  "missedRequirements": string[],
  "incorrectAssumptions": string[],
  "followUpQuestions": string[],
  "nextIterationPlan": string[],
  "confidence": "low" | "medium" | "high",
  "rubricCoverage": [
    {
      "criterion": string,
      "status": "strong" | "partial" | "missing",
      "notes": string
    }
  ]
}`;

const hintJsonContract = `{
  "hints": string[],
  "focusAreas": string[],
  "caution": string | null,
  "nextQuestion": string
}`;

const fullDesignReviewJsonContract = `{
  "score": number,
  "readiness": "needs-work" | "solid" | "interview-ready",
  "summary": string,
  "strengths": string[],
  "crossStageInconsistencies": string[],
  "tradeoffCritique": string[],
  "architectureRisks": string[],
  "interviewerFollowUps": string[],
  "nextIterationPlan": string[],
  "stageReadiness": [
    {
      "stageId": "requirements" | "core-entities" | "api-interface" | "data-flow" | "high-level-design" | "deep-dives",
      "status": "strong" | "partial" | "missing",
      "notes": string
    }
  ]
}`;

export const feedbackValidationInstruction = `You are a principal engineer conducting a system design mock interview.

Your job is to evaluate a candidate submission with rigor, not to flatter them.

Rules:
- Evaluate against the stated problem, stage, requirements, constraints, scale targets, and common pitfalls.
- When a stage rubric is provided, use it as the evaluation anchor.
- Prefer concrete, technically grounded feedback over generic comments.
- Do not invent requirements that are unsupported by the provided problem context.
- Return JSON only, with no markdown fences and no extra prose.
- The JSON must match this shape exactly:
${validationJsonContract}`;

export const hintGenerationInstruction = `You are a system design coach helping a candidate improve one stage of an interview answer.

Rules:
- Keep hints directional, not fully revealing the solution.
- Use the provided stage rubric to anchor the hints.
- Focus on what to improve next, not everything that is wrong.
- Return JSON only, with no markdown fences and no extra prose.
- The JSON must match this shape exactly:
${hintJsonContract}`;

export const fullDesignReviewInstruction = `You are a principal engineer conducting a final system design interview debrief.

Your job is to review the candidate's full answer across all interview stages.

Rules:
- Evaluate whether requirements, entities, APIs, data flow, architecture, and deep dives are mutually consistent.
- Call out concrete tradeoffs, missing bottlenecks, weak assumptions, and likely interviewer follow-ups.
- Do not rewrite the answer for the candidate; prioritize critique and next actions.
- Do not invent requirements that are unsupported by the provided problem context.
- Return JSON only, with no markdown fences and no extra prose.
- The JSON must match this shape exactly:
${fullDesignReviewJsonContract}`;

const buildStageRubricLines = (stageId: StageId | undefined): string[] => {
  if (!stageId) {
    return [];
  }

  return [
    "Stage rubric:",
    JSON.stringify(
      {
        stageId,
        ...getStageRubric(stageId),
      },
      null,
      2,
    ),
    "",
  ];
};

export const buildValidationPrompt = (
  input: ValidateDesignRequest,
): string => {
  return [
    "Evaluate the following system design submission.",
    "",
    "Problem context:",
    JSON.stringify(input.problem, null, 2),
    "",
    `Stage: ${input.stageId ?? "overall"}`,
    "",
    ...buildStageRubricLines(input.stageId),
    "Explicit requirements:",
    JSON.stringify(input.requirements, null, 2),
    "",
    "Explicit constraints:",
    JSON.stringify(input.constraints, null, 2),
    "",
    "Candidate submission:",
    input.submission.trim(),
  ].join("\n");
};

export const buildHintPrompt = (input: GenerateHintsRequest): string => {
  return [
    "Generate coaching hints for the following draft.",
    "",
    "Problem context:",
    JSON.stringify(input.problem, null, 2),
    "",
    `Stage: ${input.stageId}`,
    "",
    ...buildStageRubricLines(input.stageId),
    `Maximum hints: ${input.maxHints}`,
    "",
    "Current draft:",
    input.currentDraft.trim(),
  ].join("\n");
};

export const buildFullDesignReviewPrompt = (
  input: ReviewFullDesignRequest,
): string => {
  return [
    "Review this complete system design practice answer.",
    "",
    "Problem context:",
    JSON.stringify(input.problem, null, 2),
    "",
    "Candidate stage submissions:",
    JSON.stringify(
      input.stages.map((stage) => ({
        stageId: stage.stageId,
        stageTitle: stage.stageTitle,
        submission: stage.submission.trim() || "[empty]",
      })),
      null,
      2,
    ),
  ].join("\n");
};
