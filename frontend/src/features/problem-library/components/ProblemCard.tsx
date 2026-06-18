import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Layers,
  LockKeyhole,
  Tag,
} from "lucide-react";
import { getDifficultyClassName } from "../lib/catalog";
import type { Problem } from "../model/problem-library";
import "@/shared/ui/status-chips.css";
import "./ProblemCard.css";

interface ProblemCardProps {
  isBookmarked: boolean;
  isLocked: boolean;
  isPracticed: boolean;
  problem: Problem;
  onSelect: () => void;
}

export const ProblemCard = ({
  isBookmarked,
  isLocked,
  isPracticed,
  problem,
  onSelect,
}: ProblemCardProps) => (
  <button
    aria-label={`${isLocked ? "Locked. " : ""}${problem.title}. ${problem.difficulty}. ${problem.category}. ${problem.scale}. ${problem.summary}`}
    className={`problem-card ${isLocked ? "problem-card--locked" : ""}`}
    title={
      isLocked ? "Upgrade to Plus or Pro to open this problem." : problem.summary
    }
    type="button"
    onClick={onSelect}
  >
    <span
      className={`problem-card__icon ${
        isLocked ? "problem-card__icon--locked" : ""
      }`}
    >
      {isLocked ? (
        <LockKeyhole aria-hidden="true" size={16} strokeWidth={2} />
      ) : (
        <Layers aria-hidden="true" size={16} strokeWidth={1.9} />
      )}
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

    {isLocked || isBookmarked || isPracticed ? (
      <div className="state-row">
        {isLocked ? (
          <span className="state-chip state-chip--locked">
            <LockKeyhole aria-hidden="true" size={12} strokeWidth={2} />
            Locked
          </span>
        ) : null}
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
