import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  FileText,
  LayoutDashboard,
  ListChecks,
  Maximize2,
  Minimize2,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { useAppAuth } from "@/features/auth/app-auth";
import { sanitizeRichTextHtml } from "@/shared/lib/richText";
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
  isStarted: boolean;
  onBack: () => void;
  onMarkPracticed: () => void;
  onMarkStarted: () => void;
  onOpenPricing: () => void;
  onSaveStatusChange?: (status: PlaygroundSaveStatus) => void;
  onUnmarkStarted: () => void;
  problem: PracticeProblem | null;
}

const SIDEBAR_WIDTH_STORAGE_KEY =
  "system-design-lab.playground-sidebar-width.v2";
const MIN_SIDEBAR_WIDTH = 248;
const MAX_SIDEBAR_WIDTH = 420;
type SidebarTab = "overview" | "guides" | "editorial" | "ai";
type HighLevelDesignSurface = "diagram" | "notes";

const clampSidebarWidth = (value: number): number =>
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));

const formatInlineList = (items: string[]): string => {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const stripTerminalPeriod = (value: string): string =>
  value.endsWith(".") ? value.slice(0, -1) : value;

const lowerFirst = (value: string): string =>
  value.length > 0 ? `${value[0].toLocaleLowerCase()}${value.slice(1)}` : value;

const SolutionLoadingSkeleton = () => (
  <div
    aria-label="Loading solution"
    aria-live="polite"
    className="playground-sidebar__editorial-loading"
    role="status"
  >
    <div className="playground-sidebar__editorial-loading-title">
      <span />
      <span className="playground-sidebar__editorial-loading-heading" />
    </div>
    <div className="playground-sidebar__editorial-loading-body">
      <span />
      <span />
      <span />
      <span />
    </div>
    <div className="playground-sidebar__editorial-loading-code">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
    <div className="playground-sidebar__editorial-loading-body playground-sidebar__editorial-loading-body--short">
      <span />
      <span />
      <span />
    </div>
  </div>
);

export const PracticePlaygroundPage = ({
  isPracticed,
  isStarted,
  onBack,
  onMarkPracticed,
  onMarkStarted,
  onOpenPricing,
  onSaveStatusChange,
  onUnmarkStarted,
  problem,
}: PracticePlaygroundPageProps) => {
  const { isApiAuthReady } = useAppAuth();
  const {
    actions,
    activeStage,
    activeStageDraft,
    assistant,
    drafts,
    editorial,
    metrics,
    session,
    storage,
    stageContextCards,
    stages,
  } = usePracticePlayground(problem, {
    onSessionReset: onUnmarkStarted,
  });
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<SidebarTab>("overview");
  const [sidebarWidth, setSidebarWidth] = useState(MAX_SIDEBAR_WIDTH);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isStageboardExpanded, setIsStageboardExpanded] = useState(false);
  const [activeDesignSurface, setActiveDesignSurface] =
    useState<HighLevelDesignSurface>("diagram");
  const autoMarkedPracticedProblemIdRef = useRef<string | null>(null);
  const autoMarkedStartedProblemIdRef = useRef<string | null>(null);
  const authReady = isApiAuthReady;
  const showLoadingOverlay = storage.isLoading;
  const fallbackDrafts = createDefaultSession().stages;
  const stageDrafts = drafts ?? fallbackDrafts;
  const storageNotice = storage.errorMessage
    ? storage.errorMessage
    : storage.isLoading
      ? "Loading your saved practice session..."
      : storage.isSaving
        ? "Saving your practice session..."
        : storage.isRemote
          ? "Progress is saved to your account."
          : "Progress is saved in this browser.";
  const sanitizedEditorialHtml = editorial.contentHtml
    ? sanitizeRichTextHtml(editorial.contentHtml)
    : "";
  const focusAreaText = formatInlineList(problem?.focusAreas ?? []);
  const pitfallText = formatInlineList(problem?.pitfalls ?? []);
  const scaleText = stripTerminalPeriod(problem?.scale ?? "");

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
    const problemId = problem?.id ?? null;

    if (!problemId) {
      autoMarkedPracticedProblemIdRef.current = null;
      return;
    }

    if (metrics.completedCount < metrics.totalCount) {
      if (autoMarkedPracticedProblemIdRef.current === problemId) {
        autoMarkedPracticedProblemIdRef.current = null;
      }

      return;
    }

    if (
      isPracticed ||
      autoMarkedPracticedProblemIdRef.current === problemId
    ) {
      return;
    }

    autoMarkedPracticedProblemIdRef.current = problemId;
    onMarkPracticed();
  }, [
    isPracticed,
    metrics.completedCount,
    metrics.totalCount,
    onMarkPracticed,
    problem?.id,
  ]);

  useEffect(() => {
    const problemId = problem?.id ?? null;
    const firstStageId = stages[0]?.id ?? null;
    const hasStartedSession = Boolean(
      session &&
        (metrics.completedCount > 0 ||
          metrics.notesWordCount > 0 ||
          (firstStageId && session.activeStageId !== firstStageId)),
    );

    if (!problemId) {
      autoMarkedStartedProblemIdRef.current = null;
      return;
    }

    if (!hasStartedSession) {
      if (autoMarkedStartedProblemIdRef.current === problemId) {
        autoMarkedStartedProblemIdRef.current = null;
      }

      return;
    }

    if (
      isPracticed ||
      isStarted ||
      autoMarkedStartedProblemIdRef.current === problemId
    ) {
      return;
    }

    autoMarkedStartedProblemIdRef.current = problemId;
    onMarkStarted();
  }, [
    isPracticed,
    isStarted,
    metrics.completedCount,
    metrics.notesWordCount,
    onMarkStarted,
    problem?.id,
    session,
    stages,
  ]);

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
      aria-label="Playground sections"
      data-tour-target="playground-guidance"
      role="tablist"
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
        aria-selected={activeSidebarTab === "editorial"}
        className={`playground-sidebar__tab ${
          activeSidebarTab === "editorial"
            ? "playground-sidebar__tab--active"
            : ""
        }`}
        data-tour-target="playground-solution"
        role="tab"
        type="button"
        onClick={() => setActiveSidebarTab("editorial")}
      >
        <ScrollText aria-hidden="true" size={14} strokeWidth={2} />
        Solution
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
          data-tour-target="playground-overview"
        >
          {renderSidebarUtility()}
          {renderSidebarTabs()}

          <div className="playground-sidebar__panel">
            {activeSidebarTab === "overview" ? (
              <article
                aria-labelledby="playground-problem-description-title"
                className="playground-problem-description"
              >
                <header className="playground-problem-description__header">
                  <p className="section-label">Problem Description</p>
                  <h1 id="playground-problem-description-title">
                    {problem.title}
                  </h1>
                  <div
                    aria-label="Problem tags"
                    className="playground-problem-description__tags"
                  >
                    {[
                      problem.difficulty,
                      problem.category,
                      ...problem.focusAreas,
                    ].map((tag, index) => (
                      <span key={`${tag}-${index}`}>{tag}</span>
                    ))}
                  </div>
                </header>

                <div className="playground-problem-description__body">
                  <p>{problem.summary}</p>
                  <p>
                    Design this as a production system, not a single feature.
                    Assume the system must handle {scaleText}. Your answer
                    should define the users, core workflows, primary entities,
                    public interfaces, storage choices, read and write paths,
                    caching or indexing strategy, and the failure modes that
                    matter at this scale.
                  </p>
                  <p>
                    Ground the design in concrete examples. For this problem,
                    strong examples usually involve {focusAreaText}. When you
                    describe an example, name the request or event, the entities
                    it touches, the data store or cache involved, and the
                    response the user or downstream system observes.
                  </p>
                  <p>
                    Also make the tradeoffs explicit. Call out how the design
                    avoids {pitfallText}, what consistency guarantees are
                    realistic, and how the system behaves during traffic
                    spikes, retries, partial outages, and delayed background
                    processing.
                  </p>
                  <div className="playground-problem-description__examples">
                    <h2>Example Scenarios</h2>
                    <ul>
                      {problem.interviewVariants.map((variant) => (
                        <li key={variant}>
                          <strong>{variant}</strong>
                          <span>
                            Explain how the system would{" "}
                            {lowerFirst(stripTerminalPeriod(variant))}, what
                            changes in the API or data model, and which
                            tradeoff keeps the core path reliable.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
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

            {activeSidebarTab === "editorial" ? (
              <div className="playground-sidebar__tab-sections playground-sidebar__tab-sections--editorial">
                <section className="playground-sidebar__section playground-sidebar__section--editorial">
                  <div className="playground-sidebar__section-head">
                    <p className="section-label">
                      <ScrollText
                        aria-hidden="true"
                        size={12}
                        strokeWidth={2}
                      />
                      Expected Solution
                    </p>
                    <span className="playground-sidebar__section-date">
                      {editorial.updatedAt
                        ? new Date(editorial.updatedAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  <div className="playground-sidebar__editorial">
                    {editorial.isLocked ? (
                      <>
                        <p>Upgrade to Plus or Pro to view stage solutions.</p>
                        <button
                          className="primary-action"
                          type="button"
                          onClick={onOpenPricing}
                        >
                          View plans
                        </button>
                      </>
                    ) : !authReady ? (
                      <p>Sign in to view protected solutions.</p>
                    ) : editorial.isLoading ? (
                      <SolutionLoadingSkeleton />
                    ) : editorial.errorMessage ? (
                      <p>{editorial.errorMessage}</p>
                    ) : sanitizedEditorialHtml ? (
                      <div className="playground-sidebar__editorial-content">
                        <div className="playground-sidebar__editorial-title">
                          <span>
                            Step {activeStage.step} of {metrics.totalCount}
                          </span>
                          <h2>
                            {editorial.title ||
                              `Expected ${activeStage.title} Solution`}
                          </h2>
                        </div>
                        <div
                          className="playground-sidebar__editorial-body"
                          dangerouslySetInnerHTML={{
                            __html: sanitizedEditorialHtml,
                          }}
                        />
                      </div>
                    ) : (
                      <p>No solution has been added for this stage yet.</p>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {activeSidebarTab === "ai" ? (
              <div className="playground-sidebar__tab-sections playground-sidebar__tab-sections--ai">
                <PracticeAiReviewPanel
                  actionMode="hints-only"
                  activeStageTitle={activeStage.title}
                  assistant={assistant}
                  onOpenPricing={onOpenPricing}
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
          <div
            className="playground-stage-strip"
            data-tour-target="playground-stages"
          >
            {stages.map((stage, stageIndex) => {
              const stageDraft = stageDrafts[stage.id];
              const nextStage = stages[stageIndex + 1];
              const nextStageDraft = nextStage
                ? stageDrafts[nextStage.id]
                : null;
              const isActive = activeStage.id === stage.id;
              const hasIncomingProgress =
                stageIndex > 0 && stageDraft.isComplete;
              const hasOutgoingProgress = Boolean(nextStageDraft?.isComplete);

              return (
                <button
                  key={stage.id}
                  className={`playground-stage-step ${
                    isActive ? "playground-stage-step--active" : ""
                  } ${
                    stageDraft.isComplete
                      ? "playground-stage-step--complete"
                      : ""
                  } ${
                    hasIncomingProgress
                      ? "playground-stage-step--incoming-complete"
                      : ""
                  } ${
                    hasOutgoingProgress
                      ? "playground-stage-step--outgoing-complete"
                      : ""
                  }`}
                  type="button"
                  onClick={() => actions.setActiveStage(stage.id)}
                >
                  <span
                    aria-hidden="true"
                    className="playground-stage-step__progress playground-stage-step__progress--incoming"
                  />
                  <span
                    aria-hidden="true"
                    className="playground-stage-step__progress playground-stage-step__progress--outgoing"
                  />
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
            <section
              className="playground-stageboard__canvas"
              data-tour-target="playground-workspace"
            >
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
                {storage.isLoading ? null : activeStage.id === "high-level-design" ? (
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

            <div
              className="playground-stageboard__actions"
              data-tour-target="playground-actions"
            >
              <button
                className="secondary-action"
                type="button"
                onClick={actions.goToPreviousStage}
              >
                <ChevronLeft aria-hidden="true" size={15} strokeWidth={2} />
                Previous
              </button>
              <button
                className={`secondary-action playground-stageboard__completion-action ${
                  activeStageDraft.isComplete
                    ? "playground-stageboard__completion-action--complete"
                    : ""
                }`}
                type="button"
                onClick={() => actions.toggleStageComplete(activeStage.id)}
              >
                {activeStageDraft.isComplete ? (
                  <CircleDashed aria-hidden="true" size={15} strokeWidth={2} />
                ) : (
                  <CheckCircle2 aria-hidden="true" size={15} strokeWidth={2} />
                )}
                {activeStageDraft.isComplete
                  ? "Mark stage incomplete"
                  : "Mark stage complete"}
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
