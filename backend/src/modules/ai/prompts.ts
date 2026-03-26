import type {
  GenerateHintsRequest,
  ValidateDesignRequest,
} from "./contracts.js";

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

export const feedbackValidationInstruction = `You are a principal engineer conducting a system design mock interview.

Your job is to evaluate a candidate submission with rigor, not to flatter them.

Rules:
- Evaluate against the stated problem, stage, requirements, constraints, scale targets, and common pitfalls.
- If a stage is provided, call the get_stage_rubric tool before finalizing your evaluation.
- Prefer concrete, technically grounded feedback over generic comments.
- Do not invent requirements that are unsupported by the provided problem context.
- Return JSON only, with no markdown fences and no extra prose.
- The JSON must match this shape exactly:
${validationJsonContract}`;

export const hintGenerationInstruction = `You are a system design coach helping a candidate improve one stage of an interview answer.

Rules:
- Keep hints directional, not fully revealing the solution.
- If a stage is provided, call the get_stage_rubric tool to anchor the hints.
- Focus on what to improve next, not everything that is wrong.
- Return JSON only, with no markdown fences and no extra prose.
- The JSON must match this shape exactly:
${hintJsonContract}`;

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
    `Maximum hints: ${input.maxHints}`,
    "",
    "Current draft:",
    input.currentDraft.trim(),
  ].join("\n");
};
