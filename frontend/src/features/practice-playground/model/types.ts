import type { Problem } from "@/data/problemLibrary";
import type { SystemDesignDiagram } from "./systemDesignDiagram";

export type PracticeStageId =
  | "requirements"
  | "core-entities"
  | "api-interface"
  | "data-flow"
  | "high-level-design"
  | "deep-dives";

export interface PracticeStageDefinition {
  id: PracticeStageId;
  step: number;
  title: string;
  objective: string;
  deliverable: string;
  prompts: string[];
  reviewChecks: string[];
}

export interface PracticeStageDraft {
  hintResult: PracticeStageHintResult | null;
  notes: string;
  diagram: SystemDesignDiagram | null;
  isComplete: boolean;
  updatedAt: string | null;
  validationResult: PracticeStageValidationResult | null;
}

export type PracticeStageDraftMap = Record<PracticeStageId, PracticeStageDraft>;

export type AsyncRequestStatus = "idle" | "loading" | "success" | "error";

export type PracticeAiRequestErrorKind =
  | "auth"
  | "forbidden"
  | "network"
  | "payment"
  | "rate-limit"
  | "request"
  | "service"
  | "unknown";

export interface PracticeAiMeta {
  configured: boolean;
  model?: string;
  orchestration: "openai-compatible" | "rule-engine";
  provider: "deepseek" | "rule-engine";
  rubricVersion?: string;
}

export interface PracticeAiRequestError {
  kind: PracticeAiRequestErrorKind;
  message: string;
  occurredAt: string;
  retryable: boolean;
  statusCode: number | null;
}

export interface PracticeStageHintResult {
  caution: string | null;
  focusAreas: string[];
  hints: string[];
  meta: PracticeAiMeta;
  nextQuestion: string;
  receivedAt: string;
  sourceDraft: string;
}

export interface PracticeValidationRubricItem {
  criterion: string;
  notes: string;
  status: "strong" | "partial" | "missing";
}

export interface PracticeStageValidationResult {
  confidence: "low" | "medium" | "high";
  followUpQuestions: string[];
  gaps: string[];
  incorrectAssumptions: string[];
  meta: PracticeAiMeta;
  missedRequirements: string[];
  nextIterationPlan: string[];
  receivedAt: string;
  rubricCoverage: PracticeValidationRubricItem[];
  score: number;
  sourceDraft: string;
  strengths: string[];
  summary: string;
}

export interface PracticeFullDesignStageReadiness {
  notes: string;
  stageId: PracticeStageId;
  status: "strong" | "partial" | "missing";
}

export interface PracticeFullDesignReviewResult {
  architectureRisks: string[];
  crossStageInconsistencies: string[];
  interviewerFollowUps: string[];
  meta: PracticeAiMeta;
  nextIterationPlan: string[];
  readiness: "needs-work" | "solid" | "interview-ready";
  receivedAt: string;
  score: number;
  sourceDraft: string;
  stageReadiness: PracticeFullDesignStageReadiness[];
  strengths: string[];
  summary: string;
  tradeoffCritique: string[];
}

export interface PracticeFullDesignReviewState {
  canRequest: boolean;
  error: PracticeAiRequestError | null;
  isAvailable: boolean;
  result: PracticeFullDesignReviewResult | null;
  status: AsyncRequestStatus;
  wordCount: number;
}

export interface PracticeCoachStageState {
  hintError: PracticeAiRequestError | null;
  hintResult: PracticeStageHintResult | null;
  hintStatus: AsyncRequestStatus;
  validationError: PracticeAiRequestError | null;
  validationResult: PracticeStageValidationResult | null;
  validationStatus: AsyncRequestStatus;
}

export type PracticeCoachStageStateMap = Record<
  PracticeStageId,
  PracticeCoachStageState
>;

export interface PracticeSession {
  activeStageId: PracticeStageId;
  stages: PracticeStageDraftMap;
  updatedAt: string | null;
}

export type PracticeSessionStore = Record<string, PracticeSession>;

export interface PracticeMetrics {
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  notesWordCount: number;
  readinessLabel: string;
}

export interface StageContextCard {
  label: string;
  items: string[];
}

export interface PracticeSessionStorageState {
  errorMessage: string | null;
  isLoading: boolean;
  isRemote: boolean;
  isSaving: boolean;
  statusLabel: string;
  statusTone: "error" | "loading" | "local" | "saved" | "saving";
}

export interface PracticeStageEditorialState {
  contentHtml: string | null;
  diagramJson: SystemDesignDiagram | null;
  errorMessage: string | null;
  isLocked: boolean;
  isLoading: boolean;
  title: string | null;
  updatedAt: string | null;
}

export interface PracticePlaygroundViewModel {
  actions: {
    goToNextStage: () => void;
    goToPreviousStage: () => void;
    resetSession: () => void;
    setActiveStage: (stageId: PracticeStageId) => void;
    toggleStageComplete: (stageId: PracticeStageId) => void;
    updateActiveStageDiagram: (diagram: SystemDesignDiagram | null) => void;
    updateActiveStageNotes: (notes: string) => void;
  };
  activeStage: PracticeStageDefinition;
  activeStageDraft: PracticeStageDraft;
  assistant: {
    actions: {
      clearActiveStageFeedback: () => void;
      reloadHints: () => Promise<void>;
      reloadValidation: () => Promise<void>;
      retryHints: () => Promise<void>;
      retryFullDesignReview: () => Promise<void>;
      retryValidation: () => Promise<void>;
      clearFullDesignReview: () => void;
      requestHints: () => Promise<void>;
      requestFullDesignReview: () => Promise<void>;
      validateDraft: () => Promise<void>;
    };
    activeStageState: PracticeCoachStageState;
    canRequestHints: boolean;
    canValidateDraft: boolean;
    currentDraft: string;
    draftWordCount: number;
    fullDesignReview: PracticeFullDesignReviewState;
    hasAnyFeedback: boolean;
    isHintStale: boolean;
    isValidationStale: boolean;
  };
  editorial: PracticeStageEditorialState;
  metrics: PracticeMetrics;
  session: PracticeSession | null;
  storage: PracticeSessionStorageState;
  stageContextCards: StageContextCard[];
  stages: PracticeStageDefinition[];
  drafts: PracticeStageDraftMap | null;
}

export type PracticeProblem = Pick<
  Problem,
  | "category"
  | "difficulty"
  | "focusAreas"
  | "id"
  | "interviewVariants"
  | "pitfalls"
  | "scale"
  | "summary"
  | "title"
>;
