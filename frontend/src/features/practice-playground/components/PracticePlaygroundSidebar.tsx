import {
  ArrowLeft,
  LayoutDashboard,
  ListChecks,
  Maximize2,
  Minimize2,
  RotateCcw,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { AuthPrompt } from "@/features/auth/components/AuthPrompt";
import { PracticeAiReviewPanel } from "./PracticeAiReviewPanel";
import { PracticeSidebarEditorialPanel } from "./PracticeSidebarEditorialPanel";
import { PracticeSidebarGuidesPanel } from "./PracticeSidebarGuidesPanel";
import { PracticeSidebarOverviewPanel } from "./PracticeSidebarOverviewPanel";
import type {
  PracticeMetrics,
  PracticePlaygroundViewModel,
  PracticeProblem,
  PracticeStageDefinition,
  StageContextCard,
} from "../model/types";

export type PlaygroundSidebarTab = "overview" | "guides" | "editorial" | "ai";

interface PracticePlaygroundSidebarProps {
  activeSidebarTab: PlaygroundSidebarTab;
  activeStage: PracticeStageDefinition;
  assistant: PracticePlaygroundViewModel["assistant"];
  authReady: boolean;
  editorial: PracticePlaygroundViewModel["editorial"];
  isAuthenticated: boolean;
  isExpanded: boolean;
  isGuideHintsOpen: boolean;
  metrics: PracticeMetrics;
  onBack: () => void;
  onCloseExpanded: () => void;
  onOpenGuideHints: () => void;
  onOpenPricing: () => void;
  onResetSession: () => void;
  onSelectTab: (tab: PlaygroundSidebarTab) => void;
  onToggleExpanded: () => void;
  onToggleGuideHints: (isOpen: boolean) => void;
  problem: PracticeProblem;
  shouldShowAuthPrompt: boolean;
  stageContextCards: StageContextCard[];
}

const SidebarUtility = ({
  isExpanded,
  onBack,
  onResetSession,
  onToggleExpanded,
}: Pick<
  PracticePlaygroundSidebarProps,
  "isExpanded" | "onBack" | "onResetSession" | "onToggleExpanded"
>) => (
  <div className="playground-sidebar__utility">
    <div className="playground-sidebar__utility-links">
      <button className="playground-sidebar__link" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={14} strokeWidth={2} />
        Library
      </button>
      <button
        className="playground-sidebar__link"
        type="button"
        onClick={onResetSession}
      >
        <RotateCcw aria-hidden="true" size={14} strokeWidth={2} />
        Reset
      </button>
    </div>
    <button
      aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      aria-pressed={isExpanded}
      className="playground-sidebar__expand-toggle"
      type="button"
      onClick={onToggleExpanded}
    >
      {isExpanded ? (
        <Minimize2 aria-hidden="true" size={16} strokeWidth={2} />
      ) : (
        <Maximize2 aria-hidden="true" size={16} strokeWidth={2} />
      )}
    </button>
  </div>
);

const SidebarTabs = ({
  activeSidebarTab,
  onSelectTab,
}: Pick<PracticePlaygroundSidebarProps, "activeSidebarTab" | "onSelectTab">) => (
  <div
    className="playground-sidebar__tabs"
    aria-label="Playground sections"
    data-tour-target="playground-guidance"
    role="tablist"
  >
    <button
      aria-selected={activeSidebarTab === "overview"}
      className={`playground-sidebar__tab ${
        activeSidebarTab === "overview" ? "playground-sidebar__tab--active" : ""
      }`}
      role="tab"
      type="button"
      onClick={() => onSelectTab("overview")}
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
      onClick={() => onSelectTab("guides")}
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
      onClick={() => onSelectTab("editorial")}
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
      onClick={() => onSelectTab("ai")}
    >
      <Sparkles aria-hidden="true" size={14} strokeWidth={2} />
      AI
    </button>
  </div>
);

const AiPanel = ({
  activeStage,
  assistant,
  onOpenGuideHints,
  onOpenPricing,
}: Pick<
  PracticePlaygroundSidebarProps,
  "activeStage" | "assistant" | "onOpenGuideHints" | "onOpenPricing"
>) => (
  <div className="playground-sidebar__tab-sections playground-sidebar__tab-sections--ai">
    <PracticeAiReviewPanel
      actionMode="button-only"
      activeStageTitle={activeStage.title}
      assistant={assistant}
      onBeforeRequestHints={onOpenGuideHints}
      onOpenPricing={onOpenPricing}
    />
  </div>
);

export const PracticePlaygroundSidebar = ({
  activeSidebarTab,
  activeStage,
  assistant,
  authReady,
  editorial,
  isAuthenticated,
  isExpanded,
  isGuideHintsOpen,
  metrics,
  onBack,
  onCloseExpanded,
  onOpenGuideHints,
  onOpenPricing,
  onResetSession,
  onSelectTab,
  onToggleExpanded,
  onToggleGuideHints,
  problem,
  shouldShowAuthPrompt,
  stageContextCards,
}: PracticePlaygroundSidebarProps) => (
  <aside
    className={`playground-sidebar ${
      isExpanded ? "playground-sidebar--expanded" : ""
    }`}
    aria-label={isExpanded ? "Problem reference" : undefined}
    aria-modal={isExpanded ? true : undefined}
    data-tour-target="playground-overview"
    role={isExpanded ? "dialog" : undefined}
    onClick={isExpanded ? onCloseExpanded : undefined}
  >
    <div
      className={`playground-sidebar__modal-surface ${
        shouldShowAuthPrompt ? "playground-sidebar__modal-surface--with-auth" : ""
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <SidebarUtility
        isExpanded={isExpanded}
        onBack={onBack}
        onResetSession={onResetSession}
        onToggleExpanded={onToggleExpanded}
      />
      <SidebarTabs
        activeSidebarTab={activeSidebarTab}
        onSelectTab={onSelectTab}
      />
      <AuthPrompt ariaLabel="Sign in to save practice progress" />

      <div
        className={`playground-sidebar__panel ${
          activeSidebarTab === "editorial" && editorial.isLocked
            ? "playground-sidebar__panel--locked"
            : ""
        }`}
      >
        {activeSidebarTab === "overview" ? (
          <PracticeSidebarOverviewPanel problem={problem} />
        ) : null}

        {activeSidebarTab === "guides" ? (
          <PracticeSidebarGuidesPanel
            activeStage={activeStage}
            assistant={assistant}
            isGuideHintsOpen={isGuideHintsOpen}
            onOpenGuideHints={onOpenGuideHints}
            onToggleGuideHints={onToggleGuideHints}
            stageContextCards={stageContextCards}
          />
        ) : null}

        {activeSidebarTab === "editorial" ? (
          <PracticeSidebarEditorialPanel
            activeStage={activeStage}
            authReady={authReady}
            editorial={editorial}
            isAuthenticated={isAuthenticated}
            metrics={metrics}
            onOpenPricing={onOpenPricing}
          />
        ) : null}

        {activeSidebarTab === "ai" ? (
          <AiPanel
            activeStage={activeStage}
            assistant={assistant}
            onOpenGuideHints={onOpenGuideHints}
            onOpenPricing={onOpenPricing}
          />
        ) : null}
      </div>
    </div>
  </aside>
);
