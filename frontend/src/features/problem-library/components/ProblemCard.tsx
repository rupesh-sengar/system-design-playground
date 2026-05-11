import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Layers,
  Tag,
} from "lucide-react";
import { getDifficultyClassName } from "../lib/catalog";
import type { Problem } from "../model/problem-library";
import "@/shared/ui/status-chips.css";
import "./ProblemCard.css";

interface ProblemCardProps {
  isBookmarked: boolean;
  isPracticed: boolean;
  problem: Problem;
  onSelect: () => void;
}

export const ProblemCard = ({
  isBookmarked,
  isPracticed,
  problem,
  onSelect,
}: ProblemCardProps) => (
  <button
    aria-label={`${problem.title}. ${problem.difficulty}. ${problem.category}. ${problem.scale}. ${problem.summary}`}
    className="problem-card"
    title={problem.summary}
    type="button"
    onClick={onSelect}
  >
    <span className="problem-card__icon">
      <Layers aria-hidden="true" size={16} strokeWidth={1.9} />
    </span>

    <h3>{problem.title}</h3>
    <p>{problem.summary}</p>

    <div className="problem-card__topline">
      <span
        className={`badge badge--${getDifficultyClassName(problem.difficulty)}`}
      >
        {problem.difficulty}
      </span>
      <span className="category-chip">
        <Tag aria-hidden="true" size={12} strokeWidth={2} />
        {problem.category}
      </span>
    </div>

    {isBookmarked || isPracticed ? (
      <div className="state-row">
        {isBookmarked ? (
          <span className="state-chip">
            <Bookmark aria-hidden="true" size={12} strokeWidth={2} />
            Saved
          </span>
        ) : null}
        {isPracticed ? (
          <span className="state-chip state-chip--done">
            <CheckCircle2 aria-hidden="true" size={12} strokeWidth={2} />
            Done
          </span>
        ) : null}
      </div>
    ) : null}

    <span className="problem-card__action">
      <ChevronRight aria-hidden="true" size={17} strokeWidth={2} />
    </span>
  </button>
);
