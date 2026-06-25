import { BookOpen, ListChecks, Sparkles, Target } from "lucide-react";
import { PracticeAiReviewPanel } from "./PracticeAiReviewPanel";
import type {
  PracticePlaygroundViewModel,
  PracticeStageDefinition,
  StageContextCard,
} from "../model/types";

interface PracticeSidebarGuidesPanelProps {
  activeStage: PracticeStageDefinition;
  assistant: PracticePlaygroundViewModel["assistant"];
  isGuideHintsOpen: boolean;
  onOpenGuideHints: () => void;
  onToggleGuideHints: (isOpen: boolean) => void;
  stageContextCards: StageContextCard[];
}

export const PracticeSidebarGuidesPanel = ({
  activeStage,
  assistant,
  isGuideHintsOpen,
  onOpenGuideHints,
  onToggleGuideHints,
  stageContextCards,
}: PracticeSidebarGuidesPanelProps) => (
  <div className="playground-sidebar__tab-sections playground-sidebar__tab-sections--guides">
    <details
      className="playground-sidebar__section playground-sidebar__section--compact"
      open={isGuideHintsOpen}
      onToggle={(event) => onToggleGuideHints(event.currentTarget.open)}
    >
      <summary className="playground-sidebar__section-summary playground-sidebar__section-summary--with-action">
        <span className="section-label">
          <Sparkles aria-hidden="true" size={12} strokeWidth={2} />
          AI Hints
        </span>
        <div
          className="playground-sidebar__summary-action"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <PracticeAiReviewPanel
            actionMode="button-only"
            activeStageTitle={activeStage.title}
            assistant={assistant}
            onBeforeRequestHints={onOpenGuideHints}
          />
        </div>
      </summary>
      <div className="playground-sidebar__guide-ai">
        <PracticeAiReviewPanel
          actionMode="hints-results"
          activeStageTitle={activeStage.title}
          assistant={assistant}
        />
      </div>
    </details>

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
          <ListChecks aria-hidden="true" size={12} strokeWidth={2} />
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
          <article key={card.label} className="playground-sidebar__anchor-card">
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
);
