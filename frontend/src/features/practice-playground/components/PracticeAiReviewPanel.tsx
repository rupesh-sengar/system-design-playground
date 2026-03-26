import type { PracticePlaygroundViewModel } from "../model/types";

interface PracticeAiReviewPanelProps {
  activeStageTitle: string;
  assistant: PracticePlaygroundViewModel["assistant"];
}

const formatTimestamp = (value: string): string => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const FeedbackList = ({
  items,
  title,
}: {
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
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
};

export const PracticeAiReviewPanel = ({
  activeStageTitle,
  assistant,
}: PracticeAiReviewPanelProps) => {
  const {
    actions,
    activeStageState,
    canRequestHints,
    canValidateDraft,
    draftWordCount,
    hasAnyFeedback,
    isHintStale,
    isValidationStale,
  } = assistant;

  const hintResult = activeStageState.hintResult;
  const validationResult = activeStageState.validationResult;

  return (
    <section className="playground-ai">
      <div className="playground-ai__header">
        <div className="playground-ai__title">
          <p className="section-label">AI Review</p>
          <h3>{activeStageTitle} coach</h3>
          <p>
            Send the current stage notes to Gemini for hints or structured
            validation.
          </p>
        </div>

        <div className="playground-ai__actions">
          <button
            className="secondary-action"
            type="button"
            disabled={!canRequestHints}
            onClick={() => void actions.requestHints()}
          >
            {activeStageState.hintStatus === "loading"
              ? "Generating hints..."
              : "Get hints"}
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={!canValidateDraft}
            onClick={() => void actions.validateDraft()}
          >
            {activeStageState.validationStatus === "loading"
              ? "Validating..."
              : "Validate draft"}
          </button>
          {hasAnyFeedback ? (
            <button
              className="secondary-action"
              type="button"
              onClick={actions.clearActiveStageFeedback}
            >
              Clear results
            </button>
          ) : null}
        </div>
      </div>

      <div className="playground-ai__meta">
        <span>{draftWordCount} words in current draft</span>
        <span>
          {canValidateDraft
            ? "Ready for structured review"
            : "Write at least 20 characters to validate"}
        </span>
      </div>

      {activeStageState.hintError ? (
        <div className="playground-ai__banner playground-ai__banner--error">
          {activeStageState.hintError}
        </div>
      ) : null}

      {activeStageState.validationError ? (
        <div className="playground-ai__banner playground-ai__banner--error">
          {activeStageState.validationError}
        </div>
      ) : null}

      {!hasAnyFeedback &&
      activeStageState.hintStatus !== "loading" &&
      activeStageState.validationStatus !== "loading" &&
      !activeStageState.hintError &&
      !activeStageState.validationError ? (
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
                  {hintResult.meta.provider} / {hintResult.meta.model}
                </span>
                <span className="playground-ai__chip">
                  {formatTimestamp(hintResult.receivedAt)}
                </span>
                {isHintStale ? (
                  <span className="playground-ai__chip playground-ai__chip--stale">
                    Draft changed since request
                  </span>
                ) : null}
              </div>
            </div>

            <div className="playground-ai__grid">
              <FeedbackList items={hintResult.hints} title="Next hints" />
              <FeedbackList
                items={hintResult.focusAreas}
                title="Focus areas"
              />
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
                <span className="playground-ai__chip">
                  Score {validationResult.score}/10
                </span>
                <span className="playground-ai__chip">
                  Confidence {validationResult.confidence}
                </span>
                <span className="playground-ai__chip">
                  {validationResult.meta.model}
                </span>
                {isValidationStale ? (
                  <span className="playground-ai__chip playground-ai__chip--stale">
                    Draft changed since request
                  </span>
                ) : null}
              </div>
            </div>

            <p className="playground-ai__summary">{validationResult.summary}</p>

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
      </div>
    </section>
  );
};
