import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Layers,
  LockKeyhole,
  PlayCircle,
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
  isStarted: boolean;
  problem: Problem;
  onSelect: () => void;
  onToggleBookmark: () => void;
}

export const ProblemCard = ({
  isBookmarked,
  isLocked,
  isPracticed,
  isStarted,
  problem,
  onSelect,
  onToggleBookmark,
}: ProblemCardProps) => (
  <article
    className={`problem-card ${isLocked ? "problem-card--locked" : ""}`}
    title={
      isLocked
        ? "Upgrade to Plus or Pro to open this problem."
        : problem.summary
    }
  >
    <button
      aria-label={`${isLocked ? "Locked. " : ""}${problem.title}. ${problem.difficulty}. ${problem.category}. ${problem.scale}. ${problem.summary}`}
      className="problem-card__main"
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

      <div className="problem-card__title-container">
        <span className="problem-card__title">{problem.title}</span>
        <Bookmark
          aria-hidden="true"
          className={`problem-card__bookmark-icon ${
            isBookmarked ? "problem-card__bookmark-icon--active" : ""
          }`}
          fill={isBookmarked ? "currentColor" : "none"}
          size={13}
          strokeWidth={2}
          onClick={(event) => {
            event.stopPropagation();
            onToggleBookmark();
          }}
        />
      </div>
      <span className="problem-card__summary">{problem.summary}</span>

      <span className="problem-card__topline">
        <span
          className={`badge badge--${getDifficultyClassName(problem.difficulty)}`}
        >
          {problem.difficulty}
        </span>
        <span className="category-chip">
          <Tag aria-hidden="true" size={12} strokeWidth={2} />
          {problem.category}
        </span>
      </span>

      {isLocked || isBookmarked || isStarted || isPracticed ? (
        <span className="state-row">
          {isLocked ? (
            <span className="state-chip state-chip--locked">
              <LockKeyhole aria-hidden="true" size={12} strokeWidth={2} />
              Locked
            </span>
          ) : null}
          {isPracticed ? (
            <span className="state-chip state-chip--done">
              <CheckCircle2 aria-hidden="true" size={12} strokeWidth={2} />
              Done
            </span>
          ) : isStarted ? (
            <span className="state-chip state-chip--started">
              <PlayCircle aria-hidden="true" size={12} strokeWidth={2} />
              Started
            </span>
          ) : null}
        </span>
      ) : null}

      <span className="problem-card__action">
        <ChevronRight aria-hidden="true" size={17} strokeWidth={2} />
      </span>
    </button>
  </article>
);
