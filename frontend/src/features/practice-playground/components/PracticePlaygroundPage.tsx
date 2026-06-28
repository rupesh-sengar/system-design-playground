import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { frontendConfig } from "@/config/env";
import { useAppAuth } from "@/features/auth/app-auth";
import { useGetBillingAccountQuery } from "@/features/billing/api/billingApi";
import { Loader } from "@/shared/ui/Loader";
import {
  PracticePlaygroundSidebar,
  type PlaygroundSidebarTab,
} from "./PracticePlaygroundSidebar";
import type { AiCreditTooltipData } from "./AiCreditTooltip";
import {
  PracticeStageboard,
  type HighLevelDesignSurface,
} from "./PracticeStageboard";
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

const clampSidebarWidth = (value: number): number =>
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));

const createAiCreditTooltip = (input: {
  billingEnabled: boolean;
  hasError: boolean;
  isAuthenticated: boolean;
  isFetching: boolean;
  limit: number | null;
  remaining: number | null;
}): AiCreditTooltipData | undefined => {
  if (!input.billingEnabled) {
    return undefined;
  }

  if (!input.isAuthenticated) {
    return {
      limit: null,
      remaining: null,
      status: "signed-out",
    };
  }

  if (input.isFetching) {
    return {
      limit: null,
      remaining: null,
      status: "loading",
    };
  }

  if (input.hasError || input.remaining === null || input.limit === null) {
    return {
      limit: null,
      remaining: null,
      status: "unavailable",
    };
  }

  return {
    limit: input.limit,
    remaining: input.remaining,
    status: "ready",
  };
};

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
  const {
    isApiAuthReady,
    isAuthenticated,
    isConfigured,
  } = useAppAuth();
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
  const {
    data: billingAccount,
    error: billingAccountError,
    isFetching: isBillingAccountFetching,
  } = useGetBillingAccountQuery(undefined, {
    skip:
      !frontendConfig.features.billing ||
      !isApiAuthReady ||
      !isAuthenticated,
  });
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<PlaygroundSidebarTab>("overview");
  const [sidebarWidth, setSidebarWidth] = useState(MAX_SIDEBAR_WIDTH);
  const [isGuideHintsOpen, setIsGuideHintsOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isStageboardExpanded, setIsStageboardExpanded] = useState(false);
  const [activeDesignSurface, setActiveDesignSurface] =
    useState<HighLevelDesignSurface>("diagram");
  const autoMarkedPracticedProblemIdRef = useRef<string | null>(null);
  const autoMarkedStartedProblemIdRef = useRef<string | null>(null);
  const authReady = isApiAuthReady;
  const shouldShowSidebarAuthPrompt = isConfigured && !isAuthenticated;
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
  const aiCreditTooltip = createAiCreditTooltip({
    billingEnabled: frontendConfig.features.billing,
    hasError: Boolean(billingAccountError),
    isAuthenticated,
    isFetching: isBillingAccountFetching,
    limit: billingAccount?.usage.monthlyAi.limit ?? null,
    remaining: billingAccount?.usage.monthlyAi.remaining ?? null,
  });

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
    setIsGuideHintsOpen(false);
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

    if (isPracticed || autoMarkedPracticedProblemIdRef.current === problemId) {
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

  const openGuideHints = (): void => {
    setActiveSidebarTab("guides");
    setIsGuideHintsOpen(true);
  };

  const handleValidateDraft = (): void => {
    focusAiTab();

    if (!authReady) {
      return;
    }

    void assistant.actions.validateDraft();
  };

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
        <PracticePlaygroundSidebar
          activeSidebarTab={activeSidebarTab}
          activeStage={activeStage}
          aiCreditTooltip={aiCreditTooltip}
          assistant={assistant}
          authReady={authReady}
          editorial={editorial}
          isAuthenticated={isAuthenticated}
          isExpanded={isSidebarExpanded}
          isGuideHintsOpen={isGuideHintsOpen}
          metrics={metrics}
          problem={problem}
          shouldShowAuthPrompt={shouldShowSidebarAuthPrompt}
          stageContextCards={stageContextCards}
          onBack={onBack}
          onCloseExpanded={() => setIsSidebarExpanded(false)}
          onOpenGuideHints={openGuideHints}
          onOpenPricing={onOpenPricing}
          onResetSession={actions.resetSession}
          onSelectTab={setActiveSidebarTab}
          onToggleExpanded={() =>
            setIsSidebarExpanded((isExpanded) => !isExpanded)
          }
          onToggleGuideHints={setIsGuideHintsOpen}
        />

        <div
          aria-label="Resize playground panels"
          aria-orientation="vertical"
          className="playground-studio__divider"
          role="separator"
          tabIndex={0}
          onKeyDown={handleSidebarResizeKeyDown}
          onPointerDown={handleSidebarResizeStart}
        />

        <PracticeStageboard
          actions={actions}
          activeDesignSurface={activeDesignSurface}
          activeStage={activeStage}
          activeStageDraft={activeStageDraft}
          assistant={assistant}
          authReady={authReady}
          aiCreditTooltip={aiCreditTooltip}
          isExpanded={isStageboardExpanded}
          isStorageLoading={storage.isLoading}
          stageDrafts={stageDrafts}
          stages={stages}
          onActiveDesignSurfaceChange={setActiveDesignSurface}
          onToggleExpanded={() =>
            setIsStageboardExpanded((isExpanded) => !isExpanded)
          }
          onValidateDraft={handleValidateDraft}
        />

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
