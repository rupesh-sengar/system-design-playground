import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useState,
} from "react";
import { useAppAuth } from "@/features/auth/app-auth";
import { getDifficultyClassName } from "@/features/problem-library/lib/catalog";
import { Loader } from "@/shared/ui/Loader";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { PracticeAiReviewPanel } from "./PracticeAiReviewPanel";
import { usePracticePlayground } from "../hooks/usePracticePlayground";
import { createDefaultSession } from "../lib/session";
import type { PracticeProblem } from "../model/types";

interface PracticePlaygroundPageProps {
  isPracticed: boolean;
  onBack: () => void;
  onMarkPracticed: () => void;
  problem: PracticeProblem | null;
}

const SIDEBAR_WIDTH_STORAGE_KEY = "system-design-lab.playground-sidebar-width";
const MIN_SIDEBAR_WIDTH = 248;
const MAX_SIDEBAR_WIDTH = 420;
type SidebarTab = "overview" | "guides" | "ai";

const clampSidebarWidth = (value: number): number =>
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));

export const PracticePlaygroundPage = ({
  isPracticed,
  onBack,
  onMarkPracticed,
  problem,
}: PracticePlaygroundPageProps) => {
  const {
    canRequestApiToken,
    isApiAuthReady,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
  } = useAppAuth();
  const {
    actions,
    activeStage,
    activeStageDraft,
    assistant,
    drafts,
    metrics,
    session,
    storage,
    stageContextCards,
    stages,
  } = usePracticePlayground(problem);
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<SidebarTab>("overview");
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const canMarkPracticed = metrics.completedCount === metrics.totalCount;
  const authReady = isApiAuthReady;
  const showLoadingOverlay = storage.isRemote && storage.isLoading;
  const fallbackDrafts = createDefaultSession().stages;
  const stageDrafts = drafts ?? fallbackDrafts;
  const storageNotice = storage.errorMessage
    ? storage.errorMessage
    : storage.isRemote
      ? storage.isLoading
        ? "Loading your saved practice session..."
        : storage.isSaving
          ? "Saving your practice session..."
          : "Progress is saved to your account."
      : "Progress is stored in this browser.";

  useEffect(() => {
    const storedWidth = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);

    if (!storedWidth) {
      return;
    }

    const parsedWidth = Number.parseInt(storedWidth, 10);

    if (Number.isNaN(parsedWidth)) {
      return;
    }

    setSidebarWidth(clampSidebarWidth(parsedWidth));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

  const adjustSidebarWidth = (delta: number): void => {
    setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth + delta));
  };

  const handleSidebarResizeStart = (
    event: PointerEvent<HTMLDivElement>,
  ): void => {
    if (window.innerWidth <= 1120) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent): void => {
      setSidebarWidth(
        clampSidebarWidth(startWidth + moveEvent.clientX - startX),
      );
    };

    const handlePointerUp = (): void => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleSidebarResizeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      adjustSidebarWidth(-16);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      adjustSidebarWidth(16);
    }
  };

  const focusAiTab = (): void => {
    setActiveSidebarTab("ai");
  };

  const handleRequestHints = (): void => {
    focusAiTab();

    if (!authReady) {
      return;
    }

    void assistant.actions.requestHints();
  };

  const handleValidateDraft = (): void => {
    focusAiTab();

    if (!authReady) {
      return;
    }

    void assistant.actions.validateDraft();
  };

  const renderSidebarUtility = () => (
    <div className="playground-sidebar__utility">
      <button
        className="playground-sidebar__link"
        type="button"
        onClick={onBack}
      >
        Library
      </button>
      <button
        className="playground-sidebar__link"
        type="button"
        onClick={actions.resetSession}
      >
        Reset
      </button>
    </div>
  );

  const renderSidebarTabs = () => (
    <div
      className="playground-sidebar__tabs"
      role="tablist"
      aria-label="Playground sections"
    >
      <button
        aria-selected={activeSidebarTab === "overview"}
        className={`playground-sidebar__tab ${
          activeSidebarTab === "overview"
            ? "playground-sidebar__tab--active"
            : ""
        }`}
        role="tab"
        type="button"
        onClick={() => setActiveSidebarTab("overview")}
      >
        Overview
      </button>
      <button
        aria-selected={activeSidebarTab === "guides"}
        className={`playground-sidebar__tab ${
          activeSidebarTab === "guides" ? "playground-sidebar__tab--active" : ""
        }`}
        role="tab"
        type="button"
        onClick={() => setActiveSidebarTab("guides")}
      >
        Guides
      </button>
      <button
        aria-selected={activeSidebarTab === "ai"}
        className={`playground-sidebar__tab ${
          activeSidebarTab === "ai" ? "playground-sidebar__tab--active" : ""
        }`}
        role="tab"
        type="button"
        onClick={() => setActiveSidebarTab("ai")}
      >
        AI
      </button>
    </div>
  );

  if (!problem) {
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

  if (!showLoadingOverlay && (!session || !drafts)) {
    return (
      <div className="playground-page">
        <section className="playground-page__topbar panel">
          <button className="secondary-action" type="button" onClick={onBack}>
            Back to library
          </button>
          <div className="playground-empty">
            <p className="section-label">Interview Playground</p>
            <h2>Unable to prepare this practice round.</h2>
            <p>{storageNotice}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="playground-page">
      <section
        className="playground-studio panel"
        style={
          {
            "--playground-sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <aside className="playground-sidebar">
          {renderSidebarUtility()}
          {renderSidebarTabs()}

          <div className="playground-sidebar__panel">
            {activeSidebarTab === "overview" ? (
              <>
                <div className="playground-sidebar__problem">
                  <p className="section-label">Practice Playground</p>
                  <h1>{problem.title}</h1>
                  <p className="playground-sidebar__summary">
                    {problem.summary}
                  </p>
                  <p
                    className={`playground-storage-note ${
                      storage.errorMessage
                        ? "playground-storage-note--error"
                        : ""
                    }`}
                  >
                    {storageNotice}
                  </p>
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
                    {isPracticed ? (
                      <span className="playground-sidebar__status">
                        Practiced
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="playground-sidebar__stage">
                  <div className="playground-sidebar__stage-head">
                    <span className="playground-sidebar__stage-kicker">
                      Step {activeStage.step} of {metrics.totalCount}
                    </span>
                    <span className="playground-sidebar__stage-state">
                      {activeStageDraft.isComplete ? "Complete" : "In progress"}
                    </span>
                  </div>

                  <h2>{activeStage.title}</h2>
                  <p>{activeStage.objective}</p>

                  <dl className="playground-sidebar__facts">
                    <div className="playground-sidebar__fact">
                      <dt>Deliverable</dt>
                      <dd>{activeStage.deliverable}</dd>
                    </div>
                    <div className="playground-sidebar__fact">
                      <dt>Progress</dt>
                      <dd>
                        {metrics.completedCount}/{metrics.totalCount} complete
                      </dd>
                    </div>
                    <div className="playground-sidebar__fact">
                      <dt>Draft size</dt>
                      <dd>{metrics.notesWordCount} words</dd>
                    </div>
                    <div className="playground-sidebar__fact">
                      <dt>Readiness</dt>
                      <dd>{metrics.readinessLabel}</dd>
                    </div>
                  </dl>
                </div>

                <div className="playground-sidebar__actions">
                  <button
                    className="secondary-action playground-sidebar__action-quiet"
                    type="button"
                    onClick={() => actions.toggleStageComplete(activeStage.id)}
                  >
                    {activeStageDraft.isComplete
                      ? "Mark stage incomplete"
                      : "Mark stage complete"}
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
                  ) : null}
                </div>
              </>
            ) : null}

            {activeSidebarTab === "guides" ? (
              <div className="playground-sidebar__tab-sections">
                <section className="playground-sidebar__section">
                  <div className="playground-sidebar__section-head">
                    <p className="section-label">Prompt Yourself</p>
                    <span>{activeStage.prompts.length}</span>
                  </div>
                  <ul className="token-list">
                    {activeStage.prompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                </section>

                <section className="playground-sidebar__section">
                  <div className="playground-sidebar__section-head">
                    <p className="section-label">Review Checks</p>
                    <span>{activeStage.reviewChecks.length}</span>
                  </div>
                  <ul className="token-list token-list--warning">
                    {activeStage.reviewChecks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="playground-sidebar__section">
                  <div className="playground-sidebar__section-head">
                    <p className="section-label">Problem Anchors</p>
                    <span>{stageContextCards.length + 1}</span>
                  </div>
                  <div className="playground-sidebar__anchor-list">
                    <article className="playground-sidebar__anchor-card">
                      <h3>Scale target</h3>
                      <p>{problem.scale}</p>
                    </article>

                    {stageContextCards.map((card) => (
                      <article
                        key={card.label}
                        className="playground-sidebar__anchor-card"
                      >
                        <h3>{card.label}</h3>
                        <ul className="variant-list">
                          {card.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {activeSidebarTab === "ai" ? (
              <div className="playground-sidebar__tab-sections">
                {!authReady ? (
                  <section className="playground-sidebar__section playground-sidebar__section--ai">
                    <div className="playground-sidebar__section-head">
                      <p className="section-label">AI Setup</p>
                    </div>
                    <p className="playground-sidebar__ai-copy">
                      Sign in to unlock hinting and draft validation for the
                      current stage.
                    </p>
                    {isConfigured && canRequestApiToken && !isAuthenticated ? (
                      <button
                        className="primary-action"
                        type="button"
                        disabled={isLoading}
                        onClick={() => void login()}
                      >
                        {isLoading
                          ? "Checking session..."
                          : "Sign in to use AI"}
                      </button>
                    ) : null}
                  </section>
                ) : null}

                <PracticeAiReviewPanel
                  actionMode="clear-only"
                  activeStageTitle={activeStage.title}
                  assistant={assistant}
                />
              </div>
            ) : null}
          </div>
        </aside>

        <div
          aria-label="Resize playground panels"
          aria-orientation="vertical"
          className="playground-studio__divider"
          role="separator"
          tabIndex={0}
          onKeyDown={handleSidebarResizeKeyDown}
          onPointerDown={handleSidebarResizeStart}
        />

        <section className="playground-stageboard">
          <div className="playground-stage-strip">
            {stages.map((stage) => {
              const stageDraft = stageDrafts[stage.id];
              const isActive = activeStage.id === stage.id;

              return (
                <button
                  key={stage.id}
                  className={`playground-stage-step ${
                    isActive ? "playground-stage-step--active" : ""
                  } ${
                    stageDraft.isComplete
                      ? "playground-stage-step--complete"
                      : ""
                  }`}
                  type="button"
                  onClick={() => actions.setActiveStage(stage.id)}
                >
                  <span className="playground-stage-step__node">
                    {stage.step}
                  </span>
                  <span className="playground-stage-step__copy">
                    <strong>{stage.title}</strong>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="playground-stageboard__body">
            <section className="playground-stageboard__canvas">
              <label className="playground-workbench__notes">
                <RichTextEditor
                  value={activeStageDraft.notes}
                  onChange={actions.updateActiveStageNotes}
                  placeholder={`Write your ${activeStage.title.toLowerCase()} notes here...`}
                />
              </label>
            </section>

            <div className="playground-stageboard__actions">
              <button
                className="secondary-action"
                type="button"
                onClick={actions.goToPreviousStage}
              >
                Previous
              </button>
              <button
                className="secondary-action"
                type="button"
                disabled={authReady ? !assistant.canRequestHints : false}
                onClick={handleRequestHints}
              >
                {assistant.activeStageState.hintStatus === "loading"
                  ? "Generating hints..."
                  : "Get hints"}
              </button>
              <button
                className="primary-action"
                type="button"
                disabled={authReady ? !assistant.canValidateDraft : false}
                onClick={handleValidateDraft}
              >
                {assistant.activeStageState.validationStatus === "loading"
                  ? "Validating..."
                  : "Validate draft"}
              </button>
              <button
                className="primary-action"
                type="button"
                onClick={actions.goToNextStage}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {showLoadingOverlay ? (
          <div className="playground-loader-overlay" aria-busy="true">
            <div className="playground-loader-overlay__surface">
              <Loader
                caption={storageNotice}
                className="playground-loader-overlay__loader"
                label="Loading your saved practice session"
                size="lg"
              />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};
