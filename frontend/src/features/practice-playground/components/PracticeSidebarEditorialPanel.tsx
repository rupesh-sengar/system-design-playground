import { Lock, ScrollText } from "lucide-react";
import { sanitizeRichTextHtml } from "@/shared/lib/richText";
import type {
  PracticeMetrics,
  PracticePlaygroundViewModel,
  PracticeStageDefinition,
} from "../model/types";
import { SystemDesignDiagramPreview } from "./SystemDesignDiagramPreview";

interface PracticeSidebarEditorialPanelProps {
  activeStage: PracticeStageDefinition;
  authReady: boolean;
  editorial: PracticePlaygroundViewModel["editorial"];
  isAuthenticated: boolean;
  metrics: PracticeMetrics;
  onOpenPricing: () => void;
}

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

export const PracticeSidebarEditorialPanel = ({
  activeStage,
  authReady,
  editorial,
  isAuthenticated,
  metrics,
  onOpenPricing,
}: PracticeSidebarEditorialPanelProps) => {
  const sanitizedEditorialHtml = editorial.contentHtml
    ? sanitizeRichTextHtml(editorial.contentHtml)
    : "";
  const shouldShowSolutionDiagram =
    activeStage.id === "high-level-design" && Boolean(editorial.diagramJson);

  return (
    <div
      className={`playground-sidebar__tab-sections playground-sidebar__tab-sections--editorial ${
        editorial.isLocked ? "playground-sidebar__tab-sections--locked" : ""
      }`}
    >
      <section
        className={`playground-sidebar__section playground-sidebar__section--editorial ${
          editorial.isLocked ? "playground-sidebar__section--locked" : ""
        }`}
      >
        {!editorial.isLocked ? (
          <div className="playground-sidebar__section-head">
            <p className="section-label">
              <ScrollText aria-hidden="true" size={12} strokeWidth={2} />
              Expected Solution
            </p>
            <span className="playground-sidebar__section-date">
              {editorial.updatedAt
                ? new Date(editorial.updatedAt).toLocaleDateString()
                : ""}
            </span>
          </div>
        ) : null}
        <div className="playground-sidebar__editorial">
          {editorial.isLocked && isAuthenticated ? (
            <div className="playground-sidebar__locked-solution">
              <span
                aria-hidden="true"
                className="playground-sidebar__locked-icon"
              >
                <Lock size={24} strokeWidth={2} />
              </span>
              <div className="playground-sidebar__locked-copy">
                <h3>{isAuthenticated ? "Solution locked" : "Sign in required"}</h3>
                <p>
                  {isAuthenticated
                    ? "Upgrade to Plus or Pro to unlock reference solutions for every interview stage."
                    : "Sign in to check access to protected solutions and keep your practice progress."}
                </p>
              </div>
              {isAuthenticated ? (
                <button
                  className="playground-sidebar__upgrade-action"
                  type="button"
                  onClick={onOpenPricing}
                >
                  Upgrade
                </button>
              ) : null}
            </div>
          ) : !authReady ? (
            <p></p>
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
                  {editorial.title || `Expected ${activeStage.title} Solution`}
                </h2>
              </div>
              {shouldShowSolutionDiagram ? (
                <SystemDesignDiagramPreview
                  diagram={editorial.diagramJson}
                  title="Reference Architecture"
                />
              ) : null}
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
  );
};
