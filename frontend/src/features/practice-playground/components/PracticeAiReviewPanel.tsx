import {
  Lightbulb,
  LogIn,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { frontendConfig } from "@/config/env";
import { useAppAuth } from "@/features/auth/app-auth";
import { Loader } from "@/shared/ui/Loader";
import "@/shared/ui/shared-ui.css";
import "./PracticeAiReviewPanel.css";
import { formatSentenceCase } from "../lib/textFormatting";
import { AiCreditTooltip, type AiCreditTooltipData } from "./AiCreditTooltip";
import type {
  PracticeAiMeta,
  PracticeAiRequestError,
  PracticePlaygroundViewModel,
} from "../model/types";

interface PracticeAiReviewPanelProps {
  actionMode?:
    | "full"
    | "hints-only"
    | "hints-results"
    | "validation-only"
    | "button-only"
    | "clear-only"
    | "none";
  activeStageTitle: string;
  aiCreditTooltip?: AiCreditTooltipData;
  assistant: PracticePlaygroundViewModel["assistant"];
  onBeforeRequestHints?: () => void;
  onOpenPricing?: () => void;
}

const formatTimestamp = (value: string): string => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleString([], {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
};

const formatProviderLabel = (meta: PracticeAiMeta): string => {
  if (meta.provider === "rule-engine") {
    return `rule-engine / ${meta.rubricVersion ?? "rubric"}`;
  }

  return `${meta.provider} / ${meta.model ?? "model"}`;
};

const formatReadinessLabel = (value: string): string =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const FeedbackList = ({
  formatItem = (item: string): string => item,
  items,
  title,
}: {
  formatItem?: (item: string) => string;
  items: string[];
  title: string;
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="playground-ai__list-block">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{formatItem(item)}</li>
        ))}
      </ul>
    </section>
  );
};

const DraftComparison = ({
  currentDraft,
  sourceDraft,
}: {
  currentDraft: string;
  sourceDraft: string;
}) => {
  if (sourceDraft === currentDraft) {
    return null;
  }

  return (
    <details className="playground-ai__comparison">
      <summary>Compare with current draft</summary>
      <div className="playground-ai__comparison-grid">
        <section className="playground-ai__comparison-pane">
          <h5>Saved request</h5>
          <pre>{sourceDraft.trim() || "No draft text was captured."}</pre>
        </section>
        <section className="playground-ai__comparison-pane">
          <h5>Current draft</h5>
          <pre>{currentDraft.trim() || "Current draft is empty."}</pre>
        </section>
      </div>
    </details>
  );
};

interface AiRequestNoticeProps {
  canReload: boolean;
  canRetry: boolean;
  error: PracticeAiRequestError | null;
  hasResult: boolean;
  loadingLabel: string;
  onReload: () => Promise<void>;
  onRetry: () => Promise<void>;
  requestLabel: string;
  status: "idle" | "loading" | "success" | "error";
}

const AiRequestNotice = ({
  canReload,
  canRetry,
  error,
  hasResult,
  loadingLabel,
  onReload,
  onRetry,
  requestLabel,
  status,
}: AiRequestNoticeProps) => {
  if (status === "loading") {
    return (
      <div
        aria-live="polite"
        className="playground-ai__banner playground-ai__banner--info playground-ai__banner--loading"
      >
        <Loader
          className="playground-ai__brand-loader"
          label={loadingLabel}
          size="sm"
        />
        <div className="playground-ai__banner-copy">
          <strong>{loadingLabel}</strong>
          <p>
            {hasResult
              ? "Keeping the previous result visible until the latest response is ready."
              : "This may take a few moments depending on provider latency."}
          </p>
        </div>
      </div>
    );
  }

  if (!error) {
    return null;
  }

  const bannerVariant =
    error.kind === "payment" || error.kind === "rate-limit"
      ? "playground-ai__banner--warning"
      : "playground-ai__banner--error";

  return (
    <div className={`playground-ai__banner ${bannerVariant}`}>
      <div className="playground-ai__banner-copy">
        <strong>{requestLabel} request failed</strong>
        <p>
          {hasResult
            ? `Showing the previous result. ${error.message}`
            : error.message}
        </p>
      </div>

      <div className="playground-ai__banner-actions">
        {error.retryable ? (
          <button
            className="secondary-action playground-ai__inline-action"
            type="button"
            disabled={!canRetry}
            onClick={() => void onRetry()}
          >
            Retry
          </button>
        ) : null}

        {hasResult ? (
          <button
            className="secondary-action playground-ai__inline-action"
            type="button"
            disabled={!canReload}
            onClick={() => void onReload()}
          >
            Reload
          </button>
        ) : null}
      </div>
    </div>
  );
};

export const PracticeAiReviewPanel = ({
  actionMode = "full",
  activeStageTitle,
  aiCreditTooltip,
  assistant,
  onBeforeRequestHints,
  onOpenPricing,
}: PracticeAiReviewPanelProps) => {
  const {
    authError,
    canRequestApiToken,
    isApiAuthReady,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
  } = useAppAuth();
  const {
    actions,
    activeStageState,
    canRequestHints,
    canValidateDraft,
    currentDraft,
    fullDesignReview,
    hasAnyFeedback,
    isHintStale,
    isValidationStale,
  } = assistant;

  const hintResult = activeStageState.hintResult;
  const validationResult = activeStageState.validationResult;
  const fullReviewResult = fullDesignReview.result;
  const authReady = isApiAuthReady;
  const canRequestHintActions =
    actionMode === "full" ||
    actionMode === "hints-only" ||
    actionMode === "button-only";
  const canRequestValidationActions =
    actionMode === "full" || actionMode === "validation-only";
  const canRequestStageActions =
    canRequestHintActions || canRequestValidationActions;
  const showSignInCta =
    canRequestStageActions &&
    isConfigured &&
    canRequestApiToken &&
    !isAuthenticated &&
    !isLoading;
  const showRequestActions = canRequestStageActions && !showSignInCta;
  const showHintAction = canRequestHintActions;
  const showValidationAction = canRequestValidationActions;
  const showHintContent =
    actionMode === "full" ||
    actionMode === "hints-only" ||
    actionMode === "hints-results";
  const showValidationContent =
    actionMode === "full" || actionMode === "validation-only";
  const showCommandSurface = actionMode !== "hints-results";
  const showRecoveryActions =
    actionMode !== "none" && actionMode !== "button-only";
  const showFullReviewAction = actionMode === "full" && !showSignInCta;
  const showFullReviewContent = actionMode === "full";
  const showClearAction = hasAnyFeedback && actionMode === "full";
  const showClearFullReviewAction =
    showFullReviewContent && fullReviewResult !== null;
  const canUseHintAction =
    frontendConfig.features.aiReview &&
    (showSignInCta || (authReady && canRequestHints));
  const hintActionLabel =
    activeStageState.hintStatus === "loading" ? "Generating" : "Get hints";
  const validationActionLabel =
    activeStageState.validationStatus === "loading"
      ? "Validating"
      : actionMode === "validation-only"
        ? "Validate draft"
        : "Validate";
  const authStatusLabel = !isConfigured
    ? "Setup required"
    : !canRequestApiToken
      ? "Token unavailable"
      : !isAuthenticated
        ? "Sign in required"
        : !authReady || isLoading
          ? "Connecting"
          : "Connected";
  const draftStatusLabel =
    actionMode === "hints-only"
      ? activeStageState.hintStatus === "loading"
        ? "Generating"
        : "Hints ready"
      : canValidateDraft
        ? "Draft ready"
        : "Draft needed";
  const hintStatusLabel =
    activeStageState.hintStatus === "loading"
      ? "Generating"
      : hintResult
        ? isHintStale
          ? "Refresh suggested"
          : "Hints ready"
        : "No hints";
  const validationStatusLabel =
    activeStageState.validationStatus === "loading"
      ? "Validating"
      : validationResult
        ? isValidationStale
          ? "Refresh suggested"
          : "Validation ready"
        : "No validation";
  const commandTitle =
    actionMode === "hints-only"
      ? "Contextual hints"
      : actionMode === "validation-only"
        ? "Validate draft"
        : "Stage review";
  const helperText = !isConfigured
    ? "Configure Auth0 in the frontend before using protected AI routes."
    : !canRequestApiToken
      ? "Add an Auth0 audience so the app can request API tokens automatically."
      : !isAuthenticated
        ? "Login to enable AI feedback requests."
        : isLoading
          ? "Authentication is still initializing."
          : actionMode === "hints-only"
            ? "Ready for contextual hints"
            : canValidateDraft
              ? "Ready for structured review"
              : "Write at least 20 characters to validate";
  const emptyStateText =
    "No draft validation yet. Validate the current draft when you want a structured review pass.";

  const showEmptyState =
    actionMode === "validation-only" &&
    validationResult === null &&
    activeStageState.validationStatus !== "loading" &&
    !activeStageState.validationError;

  const handleRequestHints = (): void => {
    if (showSignInCta) {
      void login();
      return;
    }

    onBeforeRequestHints?.();
    void actions.requestHints();
  };

  const renderHintRequestButton = (className = "") => (
    <AiCreditTooltip
      align={actionMode === "button-only" ? "end" : "center"}
      data={aiCreditTooltip}
      placement={actionMode === "button-only" ? "bottom" : "top"}
    >
      <button
        className={`primary-action playground-ai__primary-action ${className}`.trim()}
        type="button"
        disabled={!canUseHintAction}
        onClick={handleRequestHints}
      >
        <Lightbulb aria-hidden="true" size={15} strokeWidth={2} />
        {hintActionLabel}
      </button>
    </AiCreditTooltip>
  );

  if (!frontendConfig.features.aiReview) {
    if (actionMode === "button-only") {
      return renderHintRequestButton("playground-ai__single-action");
    }

    return (
      <section className="playground-ai">
        <div className="playground-ai__header">
          <div className="playground-ai__title">
            <p className="section-label">AI Review</p>
            <h3>{activeStageTitle} coach</h3>
            <p>AI review is disabled in this environment.</p>
          </div>
        </div>
      </section>
    );
  }

  if (actionMode === "button-only") {
    return renderHintRequestButton("playground-ai__single-action");
  }

  return (
    <section className="playground-ai">
      {authError ? (
        <div className="playground-ai__banner playground-ai__banner--error">
          <div className="playground-ai__banner-copy">
            <strong>Authentication error</strong>
            <p>{authError}</p>
          </div>
        </div>
      ) : null}

      {showHintContent ? (
        <AiRequestNotice
          canReload={showRecoveryActions && authReady && canRequestHints}
          canRetry={showRecoveryActions && authReady && canRequestHints}
          error={activeStageState.hintError}
          hasResult={hintResult !== null}
          loadingLabel="Generating hints"
          onReload={actions.reloadHints}
          onRetry={actions.retryHints}
          requestLabel="Hints"
          status={activeStageState.hintStatus}
        />
      ) : null}

      {showFullReviewContent ? (
        <AiRequestNotice
          canReload={
            showRecoveryActions && authReady && fullDesignReview.canRequest
          }
          canRetry={
            showRecoveryActions && authReady && fullDesignReview.canRequest
          }
          error={fullDesignReview.error}
          hasResult={fullReviewResult !== null}
          loadingLabel="Reviewing the full design"
          onReload={actions.requestFullDesignReview}
          onRetry={actions.retryFullDesignReview}
          requestLabel="Full design review"
          status={fullDesignReview.status}
        />
      ) : null}

      {showValidationContent ? (
        <AiRequestNotice
          canReload={showRecoveryActions && authReady && canValidateDraft}
          canRetry={showRecoveryActions && authReady && canValidateDraft}
          error={activeStageState.validationError}
          hasResult={validationResult !== null}
          loadingLabel="Validating the current draft"
          onReload={actions.reloadValidation}
          onRetry={actions.retryValidation}
          requestLabel="Validation"
          status={activeStageState.validationStatus}
        />
      ) : null}

      <div className="playground-ai__results">
        {showHintContent && hintResult ? (
          <article className="playground-ai__card">
            {/*<div className="playground-ai__card-head">
              <div>
                <h4>AI Generated Hints</h4>
              </div>
              <div className="playground-ai__card-meta">
                {isHintStale ? (
                  <span className="playground-ai__chip playground-ai__chip--stale">
                    Draft changed
                  </span>
                ) : null}
                {showRecoveryActions ? (
                  <button
                    aria-label={
                      activeStageState.hintStatus === "loading"
                        ? "Reloading hints"
                        : "Reload hints"
                    }
                    className="secondary-action playground-ai__inline-action playground-ai__inline-action--icon"
                    type="button"
                    title={
                      activeStageState.hintStatus === "loading"
                        ? "Reloading hints"
                        : "Reload hints"
                    }
                    disabled={!authReady || !canRequestHints}
                    onClick={() => void actions.reloadHints()}
                  >
                    <RotateCcw aria-hidden="true" size={14} strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            </div>*/}

            <div className="playground-ai__grid">
              <FeedbackList
                formatItem={formatSentenceCase}
                items={hintResult.hints}
                title="Next hints"
              />
              <FeedbackList
                formatItem={formatSentenceCase}
                items={hintResult.focusAreas}
                title="Focus areas"
              />
            </div>

            {hintResult.caution ? (
              <div className="playground-ai__callout">
                <strong>Watch out</strong>
                <p>{formatSentenceCase(hintResult.caution)}</p>
              </div>
            ) : null}

            <div className="playground-ai__callout">
              <strong>Next question</strong>
              <p>{formatSentenceCase(hintResult.nextQuestion)}</p>
            </div>
          </article>
        ) : null}

        {showValidationContent && validationResult ? (
          <article className="playground-ai__card">
            <div className="playground-ai__card-head">
              <div>
                <p className="playground-ai__eyebrow">Validation</p>
                <h4>Structured review</h4>
              </div>
              <div className="playground-ai__card-meta">
                <div
                  aria-label={`Validation score ${validationResult.score} out of 10`}
                  className="playground-ai__score-card"
                >
                  <strong>{validationResult.score}</strong>
                  <span>/10 score</span>
                </div>
                {/*<div className="playground-ai__score-card playground-ai__score-card--secondary">
                  <strong>{validationResult.confidence}</strong>
                  <span>confidence</span>
                </div>*/}
                {/*<span className="playground-ai__chip">
                  {formatTimestamp(validationResult.receivedAt)}
                </span>*/}
                {isValidationStale ? (
                  <span className="playground-ai__chip playground-ai__chip--stale">
                    Draft changed since request
                  </span>
                ) : null}
                {showRecoveryActions ? (
                  <button
                    aria-label={
                      activeStageState.validationStatus === "loading"
                        ? "Reloading validation"
                        : "Reload validation"
                    }
                    className="secondary-action playground-ai__inline-action playground-ai__inline-action--icon"
                    type="button"
                    title={
                      activeStageState.validationStatus === "loading"
                        ? "Reloading validation"
                        : "Reload validation"
                    }
                    disabled={!authReady || !canValidateDraft}
                    onClick={() => void actions.reloadValidation()}
                  >
                    <RotateCcw aria-hidden="true" size={14} strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            </div>

            <p className="playground-ai__summary">{validationResult.summary}</p>

            {/*{isValidationStale ? (
              <DraftComparison
                currentDraft={currentDraft}
                sourceDraft={validationResult.sourceDraft}
              />
            ) : null}*/}

            <div className="playground-ai__grid">
              <FeedbackList
                items={validationResult.strengths}
                title="Strengths"
              />
              <FeedbackList items={validationResult.gaps} title="Gaps" />
              <FeedbackList
                items={validationResult.missedRequirements}
                title="Missed requirements"
              />
              <FeedbackList
                items={validationResult.incorrectAssumptions}
                title="Incorrect assumptions"
              />
              <FeedbackList
                items={validationResult.followUpQuestions}
                title="Follow-up questions"
              />
              <FeedbackList
                items={validationResult.nextIterationPlan}
                title="Next iteration plan"
              />
            </div>

            {validationResult.rubricCoverage.length > 0 ? (
              <section className="playground-ai__rubric">
                <h4>Rubric coverage</h4>
                <div className="playground-ai__rubric-list">
                  {validationResult.rubricCoverage.map((item) => (
                    <article
                      key={`${item.criterion}-${item.status}`}
                      className="playground-ai__rubric-row"
                    >
                      <div className="playground-ai__rubric-topline">
                        <strong>{item.criterion}</strong>
                        <span
                          className={`playground-ai__status-pill playground-ai__status-pill--${item.status}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p>{item.notes}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </article>
        ) : null}

        {showFullReviewContent && fullReviewResult ? (
          <article className="playground-ai__card">
            <div className="playground-ai__card-head">
              <div>
                <p className="playground-ai__eyebrow">Pro Review</p>
                <h4>Full design readiness</h4>
              </div>
              <div className="playground-ai__card-meta">
                <div
                  aria-label={`Full design score ${fullReviewResult.score} out of 10`}
                  className="playground-ai__score-card"
                >
                  <strong>{fullReviewResult.score}</strong>
                  <span>/10 score</span>
                </div>
                <div className="playground-ai__score-card playground-ai__score-card--secondary">
                  <strong>
                    {formatReadinessLabel(fullReviewResult.readiness)}
                  </strong>
                  <span>readiness</span>
                </div>
                <span className="playground-ai__chip">
                  {formatProviderLabel(fullReviewResult.meta)}
                </span>
                <span className="playground-ai__chip">
                  {formatTimestamp(fullReviewResult.receivedAt)}
                </span>
              </div>
            </div>

            <p className="playground-ai__summary">{fullReviewResult.summary}</p>

            <div className="playground-ai__grid">
              <FeedbackList
                items={fullReviewResult.strengths}
                title="Strengths"
              />
              <FeedbackList
                items={fullReviewResult.crossStageInconsistencies}
                title="Cross-stage inconsistencies"
              />
              <FeedbackList
                items={fullReviewResult.tradeoffCritique}
                title="Tradeoff critique"
              />
              <FeedbackList
                items={fullReviewResult.architectureRisks}
                title="Architecture risks"
              />
              <FeedbackList
                items={fullReviewResult.interviewerFollowUps}
                title="Interviewer follow-ups"
              />
              <FeedbackList
                items={fullReviewResult.nextIterationPlan}
                title="Next iteration plan"
              />
            </div>

            {fullReviewResult.stageReadiness.length > 0 ? (
              <section className="playground-ai__rubric">
                <h4>Stage readiness</h4>
                <div className="playground-ai__rubric-list">
                  {fullReviewResult.stageReadiness.map((item) => (
                    <article
                      key={`${item.stageId}-${item.status}`}
                      className="playground-ai__rubric-row"
                    >
                      <div className="playground-ai__rubric-topline">
                        <strong>{item.stageId}</strong>
                        <span
                          className={`playground-ai__status-pill playground-ai__status-pill--${item.status}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p>{item.notes}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
};
