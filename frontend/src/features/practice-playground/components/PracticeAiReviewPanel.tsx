import { frontendConfig } from "@/config/env";
import { useAppAuth } from "@/features/auth/app-auth";
import "@/shared/ui/shared-ui.css";
import "./PracticeAiReviewPanel.css";
import type {
  PracticeAiMeta,
  PracticeAiRequestError,
  PracticePlaygroundViewModel,
} from "../model/types";

interface PracticeAiReviewPanelProps {
  actionMode?: "full" | "clear-only" | "none";
  activeStageTitle: string;
  assistant: PracticePlaygroundViewModel["assistant"];
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

const FeedbackList = ({ items, title }: { items: string[]; title: string }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="playground-ai__list-block">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
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
        <span aria-hidden="true" className="playground-ai__loader" />
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
  assistant,
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
    draftWordCount,
    fullDesignReview,
    hasAnyFeedback,
    isHintStale,
    isValidationStale,
  } = assistant;

  const hintResult = activeStageState.hintResult;
  const validationResult = activeStageState.validationResult;
  const fullReviewResult = fullDesignReview.result;
  const authReady = isApiAuthReady;
  const showSignInCta =
    actionMode === "full" &&
    isConfigured &&
    canRequestApiToken &&
    !isAuthenticated &&
    !isLoading;
  const showRequestActions = actionMode === "full" && !showSignInCta;
  const showRecoveryActions = actionMode !== "none";
  const showFullReviewAction = actionMode !== "none" && !showSignInCta;
  const showClearAction =
    hasAnyFeedback && (actionMode === "full" || actionMode === "clear-only");
  const showClearFullReviewAction =
    fullReviewResult !== null && actionMode !== "none";
  const helperText = !isConfigured
    ? "Configure Auth0 in the frontend before using protected AI routes."
    : !canRequestApiToken
      ? "Add an Auth0 audience so the app can request API tokens automatically."
      : !isAuthenticated
        ? "Login to enable AI feedback requests."
        : isLoading
          ? "Authentication is still initializing."
          : canValidateDraft
            ? "Ready for structured review"
            : "Write at least 20 characters to validate";
  const fullReviewHelperText = !fullDesignReview.isAvailable
    ? "Pro unlocks full design review"
    : fullDesignReview.wordCount < 80
      ? "Write across stages to review the full design"
      : "Ready for cross-stage review";

  const showEmptyState =
    !hasAnyFeedback &&
    fullReviewResult === null &&
    activeStageState.hintStatus !== "loading" &&
    activeStageState.validationStatus !== "loading" &&
    fullDesignReview.status !== "loading" &&
    !activeStageState.hintError &&
    !activeStageState.validationError &&
    !fullDesignReview.error;

  if (!frontendConfig.features.aiReview) {
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

  return (
    <section className="playground-ai">
      <div className="playground-ai__header">
        <div className="playground-ai__title">
          <p className="section-label">AI Review</p>
          <h3>{activeStageTitle} coach</h3>
          <p>
            Send the current stage notes for hints or structured validation.
          </p>
        </div>

        <div className="playground-ai__actions">
          {showSignInCta ? (
            <button
              className="primary-action"
              type="button"
              onClick={() => void login()}
            >
              Sign in to use AI
            </button>
          ) : showRequestActions ? (
            <>
              <button
                className="secondary-action"
                type="button"
                disabled={!authReady || !canRequestHints}
                onClick={() => void actions.requestHints()}
              >
                {activeStageState.hintStatus === "loading"
                  ? "Generating hints..."
                  : "Get hints"}
              </button>
              <button
                className="primary-action"
                type="button"
                disabled={!authReady || !canValidateDraft}
                onClick={() => void actions.validateDraft()}
              >
                {activeStageState.validationStatus === "loading"
                  ? "Validating..."
                  : "Validate draft"}
              </button>
            </>
          ) : null}

          {showFullReviewAction ? (
            fullDesignReview.isAvailable ? (
              <button
                className="secondary-action"
                type="button"
                disabled={!authReady || !fullDesignReview.canRequest}
                onClick={() => void actions.requestFullDesignReview()}
              >
                {fullDesignReview.status === "loading"
                  ? "Reviewing..."
                  : "Review full design"}
              </button>
            ) : onOpenPricing ? (
              <button
                className="secondary-action"
                type="button"
                onClick={onOpenPricing}
              >
                Pro review
              </button>
            ) : null
          ) : null}

          {showClearAction ? (
            <button
              className="secondary-action"
              type="button"
              onClick={actions.clearActiveStageFeedback}
            >
              Clear results
            </button>
          ) : null}

          {showClearFullReviewAction ? (
            <button
              className="secondary-action"
              type="button"
              onClick={actions.clearFullDesignReview}
            >
              Clear full review
            </button>
          ) : null}
        </div>
      </div>

      {authError ? (
        <div className="playground-ai__banner playground-ai__banner--error">
          <div className="playground-ai__banner-copy">
            <strong>Authentication error</strong>
            <p>{authError}</p>
          </div>
        </div>
      ) : null}

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

      {showEmptyState ? (
        <p className="playground-ai__empty">
          No AI feedback yet. Use the current stage notes and request hints or
          validation when you want a review pass.
        </p>
      ) : null}

      <div className="playground-ai__results">
        {hintResult ? (
          <article className="playground-ai__card">
            <div className="playground-ai__card-head">
              <div>
                <p className="playground-ai__eyebrow">Hints</p>
                <h4>Directional coaching</h4>
              </div>
              <div className="playground-ai__card-meta">
                <span className="playground-ai__chip">
                  {formatProviderLabel(hintResult.meta)}
                </span>
                <span className="playground-ai__chip">
                  {formatTimestamp(hintResult.receivedAt)}
                </span>
                {isHintStale ? (
                  <span className="playground-ai__chip playground-ai__chip--stale">
                    Draft changed since request
                  </span>
                ) : null}
                {showRecoveryActions ? (
                  <button
                    className="secondary-action playground-ai__inline-action"
                    type="button"
                    disabled={!authReady || !canRequestHints}
                    onClick={() => void actions.reloadHints()}
                  >
                    {activeStageState.hintStatus === "loading"
                      ? "Reloading..."
                      : "Reload"}
                  </button>
                ) : null}
              </div>
            </div>

            {isHintStale ? (
              <DraftComparison
                currentDraft={currentDraft}
                sourceDraft={hintResult.sourceDraft}
              />
            ) : null}

            <div className="playground-ai__grid">
              <FeedbackList items={hintResult.hints} title="Next hints" />
              <FeedbackList items={hintResult.focusAreas} title="Focus areas" />
            </div>

            {hintResult.caution ? (
              <div className="playground-ai__callout">
                <strong>Watch out</strong>
                <p>{hintResult.caution}</p>
              </div>
            ) : null}

            <div className="playground-ai__callout">
              <strong>Next question</strong>
              <p>{hintResult.nextQuestion}</p>
            </div>
          </article>
        ) : null}

        {validationResult ? (
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
                <div className="playground-ai__score-card playground-ai__score-card--secondary">
                  <strong>{validationResult.confidence}</strong>
                  <span>confidence</span>
                </div>
                <span className="playground-ai__chip">
                  {formatProviderLabel(validationResult.meta)}
                </span>
                <span className="playground-ai__chip">
                  {formatTimestamp(validationResult.receivedAt)}
                </span>
                {isValidationStale ? (
                  <span className="playground-ai__chip playground-ai__chip--stale">
                    Draft changed since request
                  </span>
                ) : null}
                {showRecoveryActions ? (
                  <button
                    className="secondary-action playground-ai__inline-action"
                    type="button"
                    disabled={!authReady || !canValidateDraft}
                    onClick={() => void actions.reloadValidation()}
                  >
                    {activeStageState.validationStatus === "loading"
                      ? "Reloading..."
                      : "Reload"}
                  </button>
                ) : null}
              </div>
            </div>

            <p className="playground-ai__summary">{validationResult.summary}</p>

            {isValidationStale ? (
              <DraftComparison
                currentDraft={currentDraft}
                sourceDraft={validationResult.sourceDraft}
              />
            ) : null}

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

        {fullReviewResult ? (
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
