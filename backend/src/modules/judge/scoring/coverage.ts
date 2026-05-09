import { getMatchedKeywords } from "./keyword-matcher.js";
import { hasQuantification } from "./quantification.js";
import { getVectorCoverageMatch } from "./vector-coverage.js";
import type {
  RequirementCheck,
  RequirementResult,
  RequirementStatus,
} from "../types.js";
import type { ValidateDesignResponse } from "../../ai/contracts.js";

const getDetectionSource = (
  hasKeywordCoverage: boolean,
  hasVectorCoverage: boolean,
): RequirementResult["detectionSource"] => {
  if (hasKeywordCoverage && hasVectorCoverage) {
    return "keyword+vector";
  }

  if (hasKeywordCoverage) {
    return "keyword";
  }

  if (hasVectorCoverage) {
    return "vector";
  }

  return "none";
};

const buildCoverageNote = (
  check: RequirementCheck,
  result: {
    detectionSource: RequirementResult["detectionSource"];
    matchedKeywords: string[];
    similarityScore: number;
    status: RequirementStatus;
  },
): string => {
  if (result.status === "missing") {
    return `Missing: ${check.label}.`;
  }

  if (check.requiresQuantification && result.status === "partial") {
    return `${check.label} was detected but not quantified.`;
  }

  if (result.status === "partial") {
    return `${check.label} was implied semantically but needs clearer specificity.`;
  }

  if (result.detectionSource === "vector") {
    return `Covered: ${check.label} was detected through semantic similarity.`;
  }

  if (result.detectionSource === "keyword+vector") {
    return `Covered: ${check.label}. Matched keywords and semantic similarity.`;
  }

  const keywordList = result.matchedKeywords.slice(0, 4).join(", ");
  return keywordList
    ? `Covered: ${check.label}. Matched ${keywordList}.`
    : `Covered: ${check.label}.`;
};

export const evaluateCheck = (
  submission: string,
  check: RequirementCheck,
): RequirementResult => {
  const matchedKeywords = getMatchedKeywords(submission, check);
  const vectorMatch = getVectorCoverageMatch(submission, check);
  const hasKeywordCoverage = matchedKeywords.length > 0;
  const hasVectorCoverage = vectorMatch.status !== "missing";
  const detectionSource = getDetectionSource(
    hasKeywordCoverage,
    hasVectorCoverage,
  );

  if (!hasKeywordCoverage && !hasVectorCoverage) {
    return {
      id: check.id,
      label: check.label,
      status: "missing",
      weight: check.weight,
      earnedWeight: 0,
      matchedKeywords,
      detectionSource,
      notes: `Missing: ${check.label}.`,
      similarityScore: vectorMatch.score,
    };
  }

  const baseStatus: RequirementStatus =
    hasKeywordCoverage || vectorMatch.status === "strong" ? "covered" : "partial";

  const status: RequirementStatus =
    check.requiresQuantification && !hasQuantification(submission)
      ? "partial"
      : baseStatus;

  const earnedWeight = status === "covered" ? check.weight : check.weight * 0.5;
  const resultForNote = {
    detectionSource,
    matchedKeywords,
    similarityScore: vectorMatch.score,
    status,
  };

  return {
    id: check.id,
    label: check.label,
    status,
    weight: check.weight,
    earnedWeight,
    matchedKeywords,
    detectionSource,
    notes: buildCoverageNote(check, resultForNote),
    similarityScore: vectorMatch.score,
  };
};

export const evaluateChecks = (
  submission: string,
  checks: RequirementCheck[],
): RequirementResult[] => checks.map((check) => evaluateCheck(submission, check));

export const getScore = (results: RequirementResult[]): number => {
  const totalWeight = results.reduce((sum, item) => sum + item.weight, 0);
  const earnedWeight = results.reduce(
    (sum, item) => sum + item.earnedWeight,
    0,
  );

  if (totalWeight === 0) {
    return 0;
  }

  return Number(((earnedWeight / totalWeight) * 10).toFixed(1));
};

export const getConfidence = (
  results: RequirementResult[],
): ValidateDesignResponse["confidence"] => {
  const coverageScore =
    results.reduce((sum, item) => {
      if (item.status === "covered") {
        return sum + 1;
      }

      if (item.status === "partial") {
        return sum + 0.5;
      }

      return sum;
    }, 0) / Math.max(results.length, 1);

  if (coverageScore >= 0.65) {
    return "high";
  }

  if (coverageScore >= 0.35) {
    return "medium";
  }

  return "low";
};
