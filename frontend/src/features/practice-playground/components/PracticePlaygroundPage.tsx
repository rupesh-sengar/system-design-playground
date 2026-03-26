import { getDifficultyClassName } from "@/features/problem-library/lib/catalog";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { PracticeAiReviewPanel } from "./PracticeAiReviewPanel";
import { usePracticePlayground } from "../hooks/usePracticePlayground";
import type { PracticeProblem } from "../model/types";

interface PracticePlaygroundPageProps {
  isPracticed: boolean;
  onBack: () => void;
  onMarkPracticed: () => void;
  problem: PracticeProblem | null;
}

export const PracticePlaygroundPage = ({
  isPracticed,
  onBack,
  onMarkPracticed,
  problem,
}: PracticePlaygroundPageProps) => {
  const {
    actions,
    activeStage,
    activeStageDraft,
    assistant,
    drafts,
    metrics,
    session,
    stageContextCards,
    stages,
  } = usePracticePlayground(problem);
  const canMarkPracticed = metrics.completedCount === metrics.totalCount;

  if (!problem || !session || !drafts) {
    return (
      <div className="playground-page">
        <section className="playground-page__topbar panel">
          <button className="secondary-action" type="button" onClick={onBack}>
            Back to library
          </button>
          <div className="playground-empty">
            <p className="section-label">Interview Playground</p>
            <h2>Select a problem to start a focused practice round.</h2>
            <p>
              This page is structured around the six-stage interview flow:
              requirements, entities, interface, data flow, architecture, and
              deep dives.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="playground-page">
      <header className="playground-page__topbar panel">
        <div className="playground-page__topbar-row">
          <div className="playground-page__topbar-leading">
            <button className="secondary-action" type="button" onClick={onBack}>
              Back to library
            </button>

            <div className="playground-page__topbar-title">
              <h1>{problem.title}</h1>
              <div className="detail-meta">
                {"difficulty" in problem ? (
                  <span
                    className={`badge badge--${getDifficultyClassName(
                      problem.difficulty,
                    )}`}
                  >
                    {problem.difficulty}
                  </span>
                ) : null}
                <span className="category-chip">{problem.category}</span>
              </div>
            </div>
          </div>

          <div className="playground-page__topbar-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={actions.resetSession}
            >
              Reset workspace
            </button>
            {!isPracticed ? (
              <button
                className="primary-action"
                type="button"
                disabled={!canMarkPracticed}
                onClick={onMarkPracticed}
              >
                Mark practiced
              </button>
            ) : (
              <span className="state-chip state-chip--done">Practiced</span>
            )}
          </div>
        </div>

        <div className="playground-page__topbar-row playground-page__topbar-row--compact">
          <p className="playground-page__summary">{problem.summary}</p>
          <div className="playground-page__metric-strip">
            <span>
              {metrics.completedCount}/{metrics.totalCount} stages
            </span>
            <span>{metrics.notesWordCount} words</span>
            <span>{metrics.readinessLabel}</span>
          </div>
        </div>
      </header>

      <div className="playground-page__layout">
        <aside className="playground-rail panel">
          <div className="playground-rail__header">
            <p className="section-label">Interview Structure</p>
            <h2>Six stages</h2>
          </div>

          <div className="playground-rail__steps">
            {stages.map((stage) => {
              const stageDraft = drafts[stage.id];
              const isActive = activeStage.id === stage.id;

              return (
                <button
                  key={stage.id}
                  className={`playground-rail__step ${
                    isActive ? "playground-rail__step--active" : ""
                  } ${
                    stageDraft.isComplete
                      ? "playground-rail__step--complete"
                      : ""
                  }`}
                  type="button"
                  onClick={() => actions.setActiveStage(stage.id)}
                >
                  <span className="playground-rail__step-number">
                    {stage.step}
                  </span>
                  <span className="playground-rail__step-body">
                    <strong>{stage.title}</strong>
                    <span>{stage.objective}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="playground-workbench panel">
          <div className="playground-workbench__header">
            <div>
              <p className="section-label">Current Stage</p>
              <h2>
                Step {activeStage.step}: {activeStage.title}
              </h2>
              <p>{activeStage.objective}</p>
            </div>
            <div className="playground-workbench__actions">
              <button
                className="secondary-action"
                type="button"
                onClick={() => actions.toggleStageComplete(activeStage.id)}
              >
                {activeStageDraft.isComplete
                  ? "Mark incomplete"
                  : "Mark stage complete"}
              </button>
            </div>
          </div>

          <div className="playground-workbench__stage-meta">
            <span className="playground-workbench__meta-label">
              Deliverable
            </span>
            <p>{activeStage.deliverable}</p>
          </div>

          <label className="playground-workbench__notes">
            <span>Working notes</span>
            <RichTextEditor
              value={activeStageDraft.notes}
              onChange={actions.updateActiveStageNotes}
              placeholder={`Write your ${activeStage.title.toLowerCase()} notes here...`}
            />
          </label>

          <PracticeAiReviewPanel
            activeStageTitle={activeStage.title}
            assistant={assistant}
          />

          <div className="playground-workbench__nav">
            <button
              className="secondary-action"
              type="button"
              onClick={actions.goToPreviousStage}
            >
              Previous stage
            </button>
            <button
              className="primary-action"
              type="button"
              onClick={actions.goToNextStage}
            >
              Next stage
            </button>
          </div>

          <div className="playground-accordion-group">
            <details className="playground-accordion" open>
              <summary>Prompt yourself with</summary>
              <div className="playground-accordion__body">
                <ul className="token-list">
                  {activeStage.prompts.map((prompt) => (
                    <li key={prompt}>{prompt}</li>
                  ))}
                </ul>
              </div>
            </details>

            <details className="playground-accordion">
              <summary>Review before moving on</summary>
              <div className="playground-accordion__body">
                <ul className="token-list token-list--warning">
                  {activeStage.reviewChecks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </details>

            <details className="playground-accordion">
              <summary>Problem-specific anchors</summary>
              <div className="playground-accordion__body playground-accordion__body--cards">
                <section className="playground-context__card">
                  <h3>Scale target</h3>
                  <p>{problem.scale}</p>
                </section>

                {stageContextCards.map((card) => (
                  <section
                    key={card.label}
                    className="playground-context__card"
                  >
                    <h3>{card.label}</h3>
                    <ul className="variant-list">
                      {card.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
};
