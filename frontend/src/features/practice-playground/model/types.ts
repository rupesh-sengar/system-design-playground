import type { Problem } from "@/data/problemLibrary";

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
  notes: string;
  isComplete: boolean;
  updatedAt: string | null;
}

export type PracticeStageDraftMap = Record<PracticeStageId, PracticeStageDraft>;

export type AsyncRequestStatus = "idle" | "loading" | "success" | "error";

export type PracticeAiRequestErrorKind =
  | "auth"
  | "forbidden"
  | "network"
  | "rate-limit"
  | "request"
  | "service"
  | "unknown";

export interface PracticeAiMeta {
  configured: boolean;
  model: string;
  orchestration: "google-adk";
  provider: "gemini";
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

export interface PracticePlaygroundViewModel {
  actions: {
    goToNextStage: () => void;
    goToPreviousStage: () => void;
    resetSession: () => void;
    setActiveStage: (stageId: PracticeStageId) => void;
    toggleStageComplete: (stageId: PracticeStageId) => void;
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
      retryValidation: () => Promise<void>;
      requestHints: () => Promise<void>;
      validateDraft: () => Promise<void>;
    };
    activeStageState: PracticeCoachStageState;
    canRequestHints: boolean;
    canValidateDraft: boolean;
    draftWordCount: number;
    hasAnyFeedback: boolean;
    isHintStale: boolean;
    isValidationStale: boolean;
  };
  metrics: PracticeMetrics;
  session: PracticeSession | null;
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
