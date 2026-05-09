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

const findCheck = (
  rubric: StageRubric,
  id: string,
): RequirementCheck | undefined =>
  [
    ...rubric.functional,
    ...rubric.nonFunctional,
    ...rubric.scopeChecks,
  ].find((check) => check.id === id);

const buildRequirementsSummary = (score: number): string => {
  if (score >= 8) {
    return "The submission covers most key requirements with good specificity. The next step is to move into estimation and architecture tradeoffs.";
  }

  if (score >= 5) {
    return "The submission covers several core requirements but misses important parts of the problem context or lacks specificity. Strengthen the requirements before moving deeper into design.";
  }

  return "The submission captures some basic requirements, but it misses several critical requirements and lacks enough specificity for a strong system design discussion.";
};

const getGroupCoverageStatus = (
  results: RequirementResult[],
): ValidateDesignResponse["rubricCoverage"][number]["status"] => {
  if (results.length === 0 || results.every((item) => item.status === "missing")) {
    return "missing";
  }

  if (results.every((item) => item.status === "covered")) {
    return "strong";
  }

  return "partial";
};

const buildActionPlan = (
  rubric: StageRubric,
  missing: RequirementResult[],
  partial: RequirementResult[],
): string[] => {
  const prioritized = [...missing, ...partial];

  return prioritized.slice(0, 5).map((item) => {
    return (
      findCheck(rubric, item.id)?.improvementSuggestion ?? `Add ${item.label}.`
    );
  });
};

const toRubricStatus = (
  status: RequirementStatus,
): RubricCoverageItem["status"] =>
  status === "covered" ? "strong" : status;

const toCoverageResult = (item: RequirementResult): RubricCoverageItem => ({
  criterion: item.label,
  status: toRubricStatus(item.status),
  notes: item.notes,
});

export const judgeRequirementsStage = (
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

  return {
    data: {
      confidence,
      score,
      strengths: covered.map((item) => item.notes),
      gaps: [
        ...criticalMissing.map(
          (item) => `Critical missing requirement: ${item.label}.`,
        ),
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
      nextIterationPlan: buildActionPlan(rubric, missing, partial),
      rubricCoverage: [
        {
          criterion:
            "Identifies the primary user flow and the most important actions.",
          status: getGroupCoverageStatus(functionalResults),
          notes: "Evaluated based on functional requirement coverage.",
        },
        {
          criterion: "Separates in-scope and out-of-scope functionality early.",
          status: getGroupCoverageStatus(scopeResults),
          notes: scopeResults[0]?.notes ?? "Out-of-scope definition missing.",
        },
        {
          criterion:
            "Calls out latency, durability, consistency, and scale expectations.",
          status: getGroupCoverageStatus(nonFunctionalResults),
          notes:
            "Evaluated based on non-functional requirement coverage and quantification.",
        },
        ...allResults.map(toCoverageResult),
      ],
      summary: buildRequirementsSummary(score),
    },
    meta: {
      configured: true,
      orchestration: "rule-engine",
      provider: "rule-engine",
      rubricVersion: rubric.version,
    },
  };
};
