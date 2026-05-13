import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useState,
} from "react";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  FileText,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  LogIn,
  Maximize2,
  Minimize2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { useAppAuth } from "@/features/auth/app-auth";
import { getDifficultyClassName } from "@/features/problem-library/lib/catalog";
import { Loader } from "@/shared/ui/Loader";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import { PracticeAiReviewPanel } from "./PracticeAiReviewPanel";
import { SystemDesignDrawpad } from "./SystemDesignDrawpad";
import "@/shared/ui/content-lists.css";
import "@/shared/ui/shared-ui.css";
import "@/shared/ui/status-chips.css";
import "./PracticePlaygroundPage.css";
import { usePracticePlayground } from "../hooks/usePracticePlayground";
import { createDefaultSession } from "../lib/session";
import type {
  PracticeProblem,
  PracticeSessionStorageState,
} from "../model/types";

export type PlaygroundSaveStatus = Pick<
  PracticeSessionStorageState,
  "statusLabel" | "statusTone"
>;

interface PracticePlaygroundPageProps {
  isPracticed: boolean;
  onBack: () => void;
  onMarkPracticed: () => void;
  onSaveStatusChange?: (status: PlaygroundSaveStatus) => void;
  problem: PracticeProblem | null;
}

const SIDEBAR_WIDTH_STORAGE_KEY =
  "system-design-lab.playground-sidebar-width.v2";
const MIN_SIDEBAR_WIDTH = 248;
const MAX_SIDEBAR_WIDTH = 420;
type SidebarTab = "overview" | "guides" | "ai";
type HighLevelDesignSurface = "diagram" | "notes";

const clampSidebarWidth = (value: number): number =>
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));

export const PracticePlaygroundPage = ({
  isPracticed,
  onBack,
  onMarkPracticed,
  onSaveStatusChange,
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
  const [sidebarWidth, setSidebarWidth] = useState(MAX_SIDEBAR_WIDTH);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isStageboardExpanded, setIsStageboardExpanded] = useState(false);
  const [activeDesignSurface, setActiveDesignSurface] =
    useState<HighLevelDesignSurface>("diagram");
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

  useEffect(() => {
    setIsStageboardExpanded(false);
    setIsSidebarExpanded(false);
  }, [problem?.id]);

  useEffect(() => {
    onSaveStatusChange?.({
      statusLabel: storage.statusLabel,
      statusTone: storage.statusTone,
    });
  }, [onSaveStatusChange, storage.statusLabel, storage.statusTone]);

  useEffect(() => {
    if (!isSidebarExpanded && !isStageboardExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsSidebarExpanded(false);
        setIsStageboardExpanded(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarExpanded, isStageboardExpanded]);

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
      <div className="playground-sidebar__utility-links">
        <button
          className="playground-sidebar__link"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={2} />
          Library
        </button>
        <button
          className="playground-sidebar__link"
          type="button"
          onClick={actions.resetSession}
        >
          <RotateCcw aria-hidden="true" size={14} strokeWidth={2} />
          Reset
        </button>
      </div>
      <button
        aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
        aria-pressed={isSidebarExpanded}
        className="playground-sidebar__expand-toggle"
        type="button"
        onClick={() => setIsSidebarExpanded((isExpanded) => !isExpanded)}
      >
        {isSidebarExpanded ? (
          <Minimize2 aria-hidden="true" size={16} strokeWidth={2} />
        ) : (
          <Maximize2 aria-hidden="true" size={16} strokeWidth={2} />
        )}
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
        <LayoutDashboard aria-hidden="true" size={14} strokeWidth={2} />
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
        <ListChecks aria-hidden="true" size={14} strokeWidth={2} />
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
        <Sparkles aria-hidden="true" size={14} strokeWidth={2} />
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
        <aside
          className={`playground-sidebar ${
            isSidebarExpanded ? "playground-sidebar--expanded" : ""
          }`}
        >
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
                        <CheckCircle2
                          aria-hidden="true"
                          size={12}
                          strokeWidth={2}
                        />
                        Practiced
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="playground-sidebar__stage">
                  <div className="playground-sidebar__stage-head">
                    <div>
                      <span className="playground-sidebar__stage-kicker">
                        Step {activeStage.step} of {metrics.totalCount}
                      </span>
                      <h2>{activeStage.title}</h2>
                    </div>
                    <span className="playground-sidebar__stage-state">
                      {activeStageDraft.isComplete ? (
                        <CheckCircle2
                          aria-hidden="true"
                          size={12}
                          strokeWidth={2}
                        />
                      ) : (
                        <CircleDashed
                          aria-hidden="true"
                          size={12}
                          strokeWidth={2}
                        />
                      )}
                      {activeStageDraft.isComplete ? "Complete" : "In progress"}
                    </span>
                  </div>

                  <p>{activeStage.objective}</p>

                  <div className="playground-sidebar__deliverable">
                    <span>
                      <ClipboardCheck
                        aria-hidden="true"
                        size={12}
                        strokeWidth={2}
                      />
                      Deliverable
                    </span>
                    <p>{activeStage.deliverable}</p>
                  </div>
                </div>

                <dl
                  aria-label="Practice progress"
                  className="playground-sidebar__metrics"
                >
                  <div className="playground-sidebar__metric">
                    <dt>
                      <Activity aria-hidden="true" size={12} strokeWidth={2} />
                      Progress
                    </dt>
                    <dd>
                      {metrics.completedCount}/{metrics.totalCount}
                    </dd>
                  </div>
                  <div className="playground-sidebar__metric">
                    <dt>
                      <FileText aria-hidden="true" size={12} strokeWidth={2} />
                      Draft
                    </dt>
                    <dd>{metrics.notesWordCount} words</dd>
                  </div>
                  <div className="playground-sidebar__metric">
                    <dt>
                      <Gauge aria-hidden="true" size={12} strokeWidth={2} />
                      Ready
                    </dt>
                    <dd>{metrics.readinessLabel}</dd>
                  </div>
                </dl>

                <div className="playground-sidebar__actions">
                  <button
                    className="secondary-action playground-sidebar__action-quiet"
                    type="button"
                    onClick={() => actions.toggleStageComplete(activeStage.id)}
                  >
                    {activeStageDraft.isComplete ? (
                      <CircleDashed
                        aria-hidden="true"
                        size={15}
                        strokeWidth={2}
                      />
                    ) : (
                      <CheckCircle2
                        aria-hidden="true"
                        size={15}
                        strokeWidth={2}
                      />
                    )}
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
                      <CheckCircle2
                        aria-hidden="true"
                        size={15}
                        strokeWidth={2}
                      />
                      Mark practiced
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}

            {activeSidebarTab === "guides" ? (
              <div className="playground-sidebar__tab-sections playground-sidebar__tab-sections--guides">
                <details
                  className="playground-sidebar__section playground-sidebar__section--compact"
                  open
                >
                  <summary className="playground-sidebar__section-summary">
                    <span className="section-label">
                      <BookOpen aria-hidden="true" size={12} strokeWidth={2} />
                      Prompt Yourself
                    </span>
                    <span>{activeStage.prompts.length}</span>
                  </summary>
                  <ul className="token-list">
                    {activeStage.prompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                </details>

                <details className="playground-sidebar__section playground-sidebar__section--compact">
                  <summary className="playground-sidebar__section-summary">
                    <span className="section-label">
                      <ListChecks
                        aria-hidden="true"
                        size={12}
                        strokeWidth={2}
                      />
                      Review Checks
                    </span>
                    <span>{activeStage.reviewChecks.length}</span>
                  </summary>
                  <ul className="token-list token-list--warning">
                    {activeStage.reviewChecks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>

                <details className="playground-sidebar__section playground-sidebar__section--compact">
                  <summary className="playground-sidebar__section-summary">
                    <span className="section-label">
                      <Target aria-hidden="true" size={12} strokeWidth={2} />
                      Problem Anchors
                    </span>
                    <span>{stageContextCards.length}</span>
                  </summary>
                  <div className="playground-sidebar__anchor-list">
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
                </details>
              </div>
            ) : null}

            {activeSidebarTab === "ai" ? (
              <div className="playground-sidebar__tab-sections">
                {!authReady ? (
                  <section className="playground-sidebar__section playground-sidebar__section--ai">
                    <div className="playground-sidebar__section-head">
                      <p className="section-label">
                        <Sparkles
                          aria-hidden="true"
                          size={12}
                          strokeWidth={2}
                        />
                        AI Setup
                      </p>
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
                        <LogIn aria-hidden="true" size={15} strokeWidth={2} />
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

        <section
          className={`playground-stageboard ${
            isStageboardExpanded ? "playground-stageboard--expanded" : ""
          }`}
        >
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
              <button
                aria-label={
                  isStageboardExpanded ? "Collapse editor" : "Expand editor"
                }
                aria-pressed={isStageboardExpanded}
                className="playground-stageboard__expand-toggle"
                type="button"
                onClick={() =>
                  setIsStageboardExpanded((isExpanded) => !isExpanded)
                }
              >
                {isStageboardExpanded ? (
                  <Minimize2 aria-hidden="true" size={16} strokeWidth={2} />
                ) : (
                  <Maximize2 aria-hidden="true" size={16} strokeWidth={2} />
                )}
              </button>
              <div className="playground-workbench__notes">
                {activeStage.id === "high-level-design" ? (
                  <div className="playground-workbench__system-design">
                    <div
                      aria-label="High-level design workspace"
                      className="playground-workbench__surface-switch"
                      role="tablist"
                    >
                      <button
                        aria-selected={activeDesignSurface === "diagram"}
                        className={`playground-workbench__surface-tab ${
                          activeDesignSurface === "diagram"
                            ? "playground-workbench__surface-tab--active"
                            : ""
                        }`}
                        role="tab"
                        type="button"
                        onClick={() => setActiveDesignSurface("diagram")}
                      >
                        <LayoutDashboard
                          aria-hidden="true"
                          size={14}
                          strokeWidth={2}
                        />
                        Drawpad
                      </button>
                      <button
                        aria-selected={activeDesignSurface === "notes"}
                        className={`playground-workbench__surface-tab ${
                          activeDesignSurface === "notes"
                            ? "playground-workbench__surface-tab--active"
                            : ""
                        }`}
                        role="tab"
                        type="button"
                        onClick={() => setActiveDesignSurface("notes")}
                      >
                        <FileText
                          aria-hidden="true"
                          size={14}
                          strokeWidth={2}
                        />
                        Notes
                      </button>
                    </div>

                    <div className="playground-workbench__surface-panel">
                      {activeDesignSurface === "diagram" ? (
                        <SystemDesignDrawpad
                          value={activeStageDraft.diagram}
                          onChange={actions.updateActiveStageDiagram}
                        />
                      ) : (
                        <RichTextEditor
                          value={activeStageDraft.notes}
                          onChange={actions.updateActiveStageNotes}
                          placeholder="Write responsibilities, bottlenecks, and tradeoffs here..."
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <RichTextEditor
                    value={activeStageDraft.notes}
                    onChange={actions.updateActiveStageNotes}
                    placeholder={`Write your ${activeStage.title.toLowerCase()} notes here...`}
                  />
                )}
              </div>
            </section>

            <div className="playground-stageboard__actions">
              <button
                className="secondary-action"
                type="button"
                onClick={actions.goToPreviousStage}
              >
                <ChevronLeft aria-hidden="true" size={15} strokeWidth={2} />
                Previous
              </button>
              <button
                className="secondary-action"
                type="button"
                disabled={authReady ? !assistant.canRequestHints : false}
                onClick={handleRequestHints}
              >
                <Lightbulb aria-hidden="true" size={15} strokeWidth={2} />
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
                <ShieldCheck aria-hidden="true" size={15} strokeWidth={2} />
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
                <ChevronRight aria-hidden="true" size={15} strokeWidth={2} />
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
