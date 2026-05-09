import type { ValidateDesignResponse } from "../../ai/contracts.js";
import {
  evaluateChecks,
  getConfidence,
  getScore,
} from "../scoring/coverage.js";
import type {
  JudgeRequest,
  JudgeResponseEnvelope,
  RequirementCheck,
  RequirementResult,
  RequirementStatus,
  StageRubric,
} from "../types.js";

type RubricCoverageItem = ValidateDesignResponse["rubricCoverage"][number];

const stageTitles: Record<StageRubric["stageId"], string> = {
  requirements: "requirements",
  "core-entities": "core entity modeling",
  "api-interface": "API/interface design",
  "data-flow": "data-flow design",
  "high-level-design": "high-level architecture",
  "deep-dives": "deep-dive analysis",
};

const getGroupCoverageStatus = (
  results: RequirementResult[],
): RubricCoverageItem["status"] => {
  if (results.length === 0 || results.every((item) => item.status === "missing")) {
    return "missing";
  }

  if (results.every((item) => item.status === "covered")) {
    return "strong";
  }

  return "partial";
};

const findCheck = (
  rubric: StageRubric,
  id: string,
): RequirementCheck | undefined =>
  [
    ...rubric.functional,
    ...rubric.nonFunctional,
    ...rubric.scopeChecks,
  ].find((check) => check.id === id);

const toRubricStatus = (
  status: RequirementStatus,
): RubricCoverageItem["status"] =>
  status === "covered" ? "strong" : status;

const toCoverageResult = (item: RequirementResult): RubricCoverageItem => ({
  criterion: item.label,
  status: toRubricStatus(item.status),
  notes: item.notes,
});

const buildSummary = (stageTitle: string, score: number): string => {
  if (score >= 8) {
    return `The submission covers the ${stageTitle} stage well and connects the design to the problem constraints. The next step is to sharpen tradeoffs and edge cases.`;
  }

  if (score >= 5) {
    return `The submission has a workable ${stageTitle} direction, but it misses important production details or problem-specific anchors. Tighten the gaps before moving on.`;
  }

  return `The submission is too thin for the ${stageTitle} stage. It needs more problem-specific detail, clearer production constraints, and stronger tradeoff reasoning.`;
};

export const judgeChecklistStage = (
  payload: JudgeRequest,
  rubric: StageRubric,
): JudgeResponseEnvelope => {
  const functionalResults = evaluateChecks(payload.submission, rubric.functional);
  const nonFunctionalResults = evaluateChecks(
    payload.submission,
    rubric.nonFunctional,
  );
  const scopeResults = evaluateChecks(payload.submission, rubric.scopeChecks);

  const allResults = [
    ...functionalResults,
    ...nonFunctionalResults,
    ...scopeResults,
  ];

  const score = getScore(allResults);
  const confidence = getConfidence(allResults);
  const covered = allResults.filter((item) => item.status === "covered");
  const partial = allResults.filter((item) => item.status === "partial");
  const missing = allResults.filter((item) => item.status === "missing");
  const criticalMissing = missing.filter(
    (item) => findCheck(rubric, item.id)?.importance === "critical",
  );
  const stageTitle = stageTitles[rubric.stageId];

  return {
    data: {
      confidence,
      score,
      strengths: covered.map((item) => item.notes),
      gaps: [
        ...criticalMissing.map((item) => `Critical missing item: ${item.label}.`),
        ...partial.map(
          (item) => `${item.label} needs more specificity or quantification.`,
        ),
      ],
      missedRequirements: missing.map((item) => item.label),
      incorrectAssumptions: [],
      followUpQuestions: missing.slice(0, 6).map((item) => {
        return (
          findCheck(rubric, item.id)?.followUpQuestion ??
          `Can you expand on ${item.label}?`
        );
      }),
      nextIterationPlan: [...missing, ...partial].slice(0, 5).map((item) => {
        return (
          findCheck(rubric, item.id)?.improvementSuggestion ??
          `Add ${item.label}.`
        );
      }),
      rubricCoverage: [
        {
          criterion: `${stageTitle}: problem-specific coverage`,
          status: getGroupCoverageStatus(functionalResults),
          notes: "Evaluated against stage-specific domain and design checks.",
        },
        {
          criterion: `${stageTitle}: production readiness`,
          status: getGroupCoverageStatus(nonFunctionalResults),
          notes: "Evaluated against operational, scale, and correctness checks.",
        },
        {
          criterion: `${stageTitle}: scope and tradeoff discipline`,
          status: getGroupCoverageStatus(scopeResults),
          notes:
            scopeResults[0]?.notes ??
            "Scope and tradeoff boundaries were not clearly stated.",
        },
        ...allResults.map(toCoverageResult),
      ],
      summary: buildSummary(stageTitle, score),
    },
    meta: {
      configured: true,
      orchestration: "rule-engine",
      provider: "rule-engine",
      rubricVersion: rubric.version,
    },
  };
};
