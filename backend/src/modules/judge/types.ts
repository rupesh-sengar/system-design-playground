import type {
  StageId,
  ValidateDesignRequest,
  ValidateDesignResponse,
} from "../ai/contracts.js";

export type RequirementStatus = "covered" | "partial" | "missing";

export type RequirementImportance = "critical" | "important" | "nice-to-have";

export type RequirementCheck = {
  id: string;
  label: string;
  description?: string;
  weight: number;
  keywords: string[];
  synonyms?: string[];
  vectorPhrases?: string[];
  negativeKeywords?: string[];
  requiresQuantification?: boolean;
  quantificationHints?: string[];
  importance: RequirementImportance;
  followUpQuestion: string;
  improvementSuggestion: string;
};

export type RequirementResult = {
  id: string;
  label: string;
  status: RequirementStatus;
  weight: number;
  earnedWeight: number;
  matchedKeywords: string[];
  detectionSource: "keyword" | "keyword+vector" | "none" | "vector";
  notes: string;
  similarityScore: number;
};

export type StageRubric = {
  problemId: string;
  stageId: StageId;
  version: string;
  scoring: {
    functionalWeight: number;
    nonFunctionalWeight: number;
    specificityWeight: number;
    scopeWeight: number;
    problemAlignmentWeight: number;
  };
  functional: RequirementCheck[];
  nonFunctional: RequirementCheck[];
  scopeChecks: RequirementCheck[];
};

export type JudgeProviderMeta = {
  configured: boolean;
  orchestration: "rule-engine";
  provider: "rule-engine";
  rubricVersion: string;
};

export type JudgeRequest = ValidateDesignRequest;

export type JudgeResponseEnvelope = {
  data: ValidateDesignResponse;
  meta: JudgeProviderMeta;
};
