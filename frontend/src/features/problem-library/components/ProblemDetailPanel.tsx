import { difficultyGuidance, getDifficultyClassName } from "../lib/catalog";
import type { Problem } from "../model/problem-library";

interface ProblemDetailPanelProps {
  isBookmarked: boolean;
  isPracticed: boolean;
  onOpenPlayground: () => void;
  problem: Problem | null;
  onToggleBookmark: () => void;
  onTogglePracticed: () => void;
}

export const ProblemDetailPanel = ({
  isBookmarked,
  isPracticed,
  onOpenPlayground,
  problem,
  onToggleBookmark,
  onTogglePracticed,
}: ProblemDetailPanelProps) => {
  if (!problem) {
    return (
      <article className="detail-empty">
        <p className="section-label">Practice Panel</p>
        <h2>Choose a problem to start a drill.</h2>
        <p>
          Use the library on the left to select a prompt, or pick a random drill
          from the header.
        </p>
      </article>
    );
  }

  return (
    <article className="detail-card">
      <div className="detail-card__header">
        <div>
          <p className="section-label">Selected prompt</p>
          <h2>{problem.title}</h2>

          <div className="detail-meta">
            <span
              className={`badge badge--${getDifficultyClassName(problem.difficulty)}`}
            >
              {problem.difficulty}
            </span>
            <span className="category-chip">{problem.category}</span>
          </div>
        </div>

        <div className="detail-actions">
          <button
            className="primary-action"
            type="button"
            onClick={onOpenPlayground}
          >
            Open playground
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={onToggleBookmark}
          >
            {isBookmarked ? "Remove bookmark" : "Bookmark"}
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={onTogglePracticed}
          >
            {isPracticed ? "Mark unpracticed" : "Mark practiced"}
          </button>
        </div>
      </div>

      <section className="detail-section detail-section--accent">
        <p>{problem.summary}</p>

        <div className="scale-note">
          <span className="section-label">Scale target</span>
          <p>{problem.scale}</p>
        </div>

        <p className="guidance">{difficultyGuidance[problem.difficulty]}</p>
      </section>

      <section className="detail-section">
        <h3>Design focus</h3>
        <ul className="token-list">
          {problem.focusAreas.map((focusArea) => (
            <li key={focusArea}>{focusArea}</li>
          ))}
        </ul>
      </section>

      <section className="detail-section">
        <h3>Failure modes to discuss</h3>
        <ul className="token-list token-list--warning">
          {problem.pitfalls.map((pitfall) => (
            <li key={pitfall}>{pitfall}</li>
          ))}
        </ul>
      </section>

      <section className="detail-section">
        <h3>Strong follow-up variants</h3>
        <ul className="variant-list">
          {problem.interviewVariants.map((variant) => (
            <li key={variant}>{variant}</li>
          ))}
        </ul>
      </section>

      <section className="detail-section">
        <h3>Recommended interview flow</h3>
        <ol className="interview-flow">
          <li>
            Clarify functional requirements, non-functional goals, and product
            constraints.
          </li>
          <li>
            Estimate traffic, storage, and peak read and write patterns before
            choosing components.
          </li>
          <li>
            Sketch the high-level architecture, core APIs, and data model.
          </li>
          <li>
            Deep dive into the hardest tradeoff, bottleneck, or consistency
            decision.
          </li>
          <li>
            Close with reliability, observability, security, and future scale
            improvements.
          </li>
        </ol>
      </section>
    </article>
  );
};
