import type { ValidateDesignResponse } from "../ai/contracts.js";
import { getCuratedStageRubric } from "./rubrics/curated-stage.registry.js";
import { judgeChecklistStage } from "./stages/checklist.stage.js";
import { judgeRequirementsStage } from "./stages/requirements.stage.js";
import type { JudgeRequest, JudgeResponseEnvelope } from "./types.js";

const buildUnsupportedResponse = (
  payload: JudgeRequest,
): JudgeResponseEnvelope => ({
  data: {
    confidence: "low",
    score: 0,
    strengths: [],
    gaps: ["No rubric configured for this problem and stage."],
    missedRequirements: [],
    incorrectAssumptions: [],
    followUpQuestions: [],
    nextIterationPlan: [
      `Configure a rubric for ${payload.problem.id} / ${
        payload.stageId ?? "overall"
      }.`,
    ],
    rubricCoverage: [],
    summary: "No judge configuration was found for this problem and stage.",
  } satisfies ValidateDesignResponse,
  meta: {
    configured: false,
    orchestration: "rule-engine",
    provider: "rule-engine",
    rubricVersion: "none",
  },
});

export const judgeSubmission = async (
  payload: JudgeRequest,
): Promise<JudgeResponseEnvelope> => {
  if (payload.stageId) {
    const rubric = getCuratedStageRubric(payload.problem, payload.stageId);

    if (!rubric) {
      return buildUnsupportedResponse(payload);
    }

    return payload.stageId === "requirements"
      ? judgeRequirementsStage(payload, rubric)
      : judgeChecklistStage(payload, rubric);
  }

  return buildUnsupportedResponse(payload);
};
