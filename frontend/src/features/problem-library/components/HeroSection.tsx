import type { ProblemLibraryMetrics } from "../model/types";

interface HeroSectionProps {
  metrics: ProblemLibraryMetrics;
  onPickRandomProblem: () => void;
  onResetProgress: () => void;
}

export const HeroSection = ({
  metrics,
  onPickRandomProblem,
  onResetProgress,
}: HeroSectionProps) => (
  <header className="app-header panel">
    <div className="app-header__main">
      <div className="app-header__copy">
        <p className="eyebrow">System Design Lab</p>
        <h1>Problem Library</h1>
        <p className="app-header__subtitle">
          Browse prompts, narrow the list quickly, and jump straight into a
          focused practice round.
        </p>
      </div>

      <div className="app-header__actions">
        <button
          className="primary-action"
          type="button"
          onClick={onPickRandomProblem}
        >
          Random Drill
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={onResetProgress}
        >
          Reset Progress
        </button>
      </div>
    </div>

    <div className="app-header__meta">
      <span>{metrics.totalProblems} problems</span>
      <span>{metrics.visibleCount} visible</span>
      <span>{metrics.practicedCount} practiced</span>
      <span>
        {metrics.totalDifficultyCounts.Easy} /{" "}
        {metrics.totalDifficultyCounts.Medium} /{" "}
        {metrics.totalDifficultyCounts.Hard} mix
      </span>
    </div>
  </header>
);
