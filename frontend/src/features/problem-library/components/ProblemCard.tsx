import { getDifficultyClassName } from "../lib/catalog";
import type { Problem } from "../model/problem-library";

interface ProblemCardProps {
  isBookmarked: boolean;
  isPracticed: boolean;
  isSelected: boolean;
  problem: Problem;
  onSelect: () => void;
}

export const ProblemCard = ({
  isBookmarked,
  isPracticed,
  isSelected,
  problem,
  onSelect,
}: ProblemCardProps) => (
  <button
    className={`problem-card ${isSelected ? "problem-card--active" : ""}`}
    type="button"
    onClick={onSelect}
  >
    <div className="problem-card__topline">
      <span className={`badge badge--${getDifficultyClassName(problem.difficulty)}`}>
        {problem.difficulty}
      </span>
      <span className="category-chip">{problem.category}</span>
    </div>

    <h3>{problem.title}</h3>
    <p>{problem.summary}</p>

    <div className="problem-card__footer">
      <span>{problem.scale}</span>
    </div>

    <div className="state-row">
      {isBookmarked ? <span className="state-chip">Bookmarked</span> : null}
      {isPracticed ? <span className="state-chip state-chip--done">Practiced</span> : null}
    </div>
  </button>
);
