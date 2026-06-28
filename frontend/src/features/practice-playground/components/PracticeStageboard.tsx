import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  FileText,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  ShieldCheck,
} from "lucide-react";
import { RichTextEditor } from "@/shared/ui/RichTextEditor";
import {
  AiCreditTooltip,
  type AiCreditTooltipData,
} from "./AiCreditTooltip";
import { SystemDesignDrawpad } from "./SystemDesignDrawpad";
import type {
  PracticePlaygroundViewModel,
  PracticeStageDraft,
  PracticeStageDraftMap,
  PracticeStageDefinition,
} from "../model/types";

export type HighLevelDesignSurface = "diagram" | "notes";

interface PracticeStageboardProps {
  actions: PracticePlaygroundViewModel["actions"];
  activeDesignSurface: HighLevelDesignSurface;
  activeStage: PracticeStageDefinition;
  activeStageDraft: PracticeStageDraft;
  aiCreditTooltip?: AiCreditTooltipData;
  assistant: PracticePlaygroundViewModel["assistant"];
  authReady: boolean;
  isExpanded: boolean;
  isStorageLoading: boolean;
  onActiveDesignSurfaceChange: (surface: HighLevelDesignSurface) => void;
  onToggleExpanded: () => void;
  onValidateDraft: () => void;
  stageDrafts: PracticeStageDraftMap;
  stages: PracticeStageDefinition[];
}

export const PracticeStageboard = ({
  actions,
  activeDesignSurface,
  activeStage,
  activeStageDraft,
  aiCreditTooltip,
  assistant,
  authReady,
  isExpanded,
  isStorageLoading,
  onActiveDesignSurfaceChange,
  onToggleExpanded,
  onValidateDraft,
  stageDrafts,
  stages,
}: PracticeStageboardProps) => (
  <section
    className={`playground-stageboard ${
      isExpanded ? "playground-stageboard--expanded" : ""
    }`}
  >
    <div className="playground-stage-strip" data-tour-target="playground-stages">
      {stages.map((stage, stageIndex) => {
        const stageDraft = stageDrafts[stage.id];
        const nextStage = stages[stageIndex + 1];
        const nextStageDraft = nextStage ? stageDrafts[nextStage.id] : null;
        const isActive = activeStage.id === stage.id;
        const hasIncomingProgress = stageIndex > 0 && stageDraft.isComplete;
        const hasOutgoingProgress = Boolean(nextStageDraft?.isComplete);

        return (
          <button
            key={stage.id}
            className={`playground-stage-step ${
              isActive ? "playground-stage-step--active" : ""
            } ${
              stageDraft.isComplete ? "playground-stage-step--complete" : ""
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
            <span className="playground-stage-step__node">{stage.step}</span>
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
          aria-label={isExpanded ? "Collapse editor" : "Expand editor"}
          aria-pressed={isExpanded}
          className="playground-stageboard__expand-toggle"
          type="button"
          onClick={onToggleExpanded}
        >
          {isExpanded ? (
            <Minimize2 aria-hidden="true" size={16} strokeWidth={2} />
          ) : (
            <Maximize2 aria-hidden="true" size={16} strokeWidth={2} />
          )}
        </button>
        <div className="playground-workbench__notes">
          {isStorageLoading ? null : activeStage.id === "high-level-design" ? (
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
                  onClick={() => onActiveDesignSurfaceChange("diagram")}
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
                  onClick={() => onActiveDesignSurfaceChange("notes")}
                >
                  <FileText aria-hidden="true" size={14} strokeWidth={2} />
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
        <AiCreditTooltip data={aiCreditTooltip} placement="top">
          <button
            className="primary-action"
            type="button"
            disabled={authReady ? !assistant.canValidateDraft : false}
            onClick={onValidateDraft}
          >
            <ShieldCheck aria-hidden="true" size={15} strokeWidth={2} />
            {assistant.activeStageState.validationStatus === "loading"
              ? "Validating..."
              : "Validate draft"}
          </button>
        </AiCreditTooltip>
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
);
