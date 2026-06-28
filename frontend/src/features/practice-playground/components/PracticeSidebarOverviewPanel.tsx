import { Tag } from "lucide-react";
import type { PracticeProblem } from "../model/types";

interface PracticeSidebarOverviewPanelProps {
  problem: PracticeProblem;
}

type ProblemDescriptionTagTone =
  | "category"
  | "difficulty-easy"
  | "difficulty-medium"
  | "difficulty-hard"
  | "focus-area";

interface ProblemDescriptionTag {
  key: string;
  label: string;
  tone: ProblemDescriptionTagTone;
}

const difficultyTagTones: Record<
  PracticeProblem["difficulty"],
  ProblemDescriptionTagTone
> = {
  Easy: "difficulty-easy",
  Medium: "difficulty-medium",
  Hard: "difficulty-hard",
};

const formatInlineList = (items: string[]): string => {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const stripTerminalPeriod = (value: string): string =>
  value.endsWith(".") ? value.slice(0, -1) : value;

const lowerFirst = (value: string): string =>
  value.length > 0 ? `${value[0].toLocaleLowerCase()}${value.slice(1)}` : value;

const formatTagLabel = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");

const buildProblemDescriptionTags = (
  problem: PracticeProblem,
): ProblemDescriptionTag[] => [
  {
    key: "difficulty",
    label: problem.difficulty,
    tone: difficultyTagTones[problem.difficulty],
  },
  {
    key: "category",
    label: problem.category,
    tone: "category",
  },
  ...problem.focusAreas.map((focusArea, index) => ({
    key: `focus-area-${index}-${focusArea}`,
    label: focusArea,
    tone: "focus-area" as const,
  })),
];

export const PracticeSidebarOverviewPanel = ({
  problem,
}: PracticeSidebarOverviewPanelProps) => {
  const focusAreaText = formatInlineList(problem.focusAreas);
  const pitfallText = formatInlineList(problem.pitfalls);
  const scaleText = stripTerminalPeriod(problem.scale);
  const problemTags = buildProblemDescriptionTags(problem);

  return (
    <article
      aria-labelledby="playground-problem-description-title"
      className="playground-problem-description"
    >
      <header className="playground-problem-description__header">
        <p className="section-label">Problem Description</p>
        <h1 id="playground-problem-description-title">{problem.title}</h1>
        <div
          aria-label="Problem tags"
          className="playground-problem-description__tags"
        >
          {problemTags.map((tag) => (
            <span
              key={tag.key}
              className={[
                "playground-problem-description__tag",
                `playground-problem-description__tag--${tag.tone}`,
              ].join(" ")}
            >
              <Tag aria-hidden="true" size={12} strokeWidth={2} />
              {formatTagLabel(tag.label)}
            </span>
          ))}
        </div>
      </header>

      <div className="playground-problem-description__body">
        <p>{problem.summary}</p>
        <p>
          Design this as a production system, not a single feature. Assume the
          system must handle {scaleText}. Your answer should define the users,
          core workflows, primary entities, public interfaces, storage choices,
          read and write paths, caching or indexing strategy, and the failure
          modes that matter at this scale.
        </p>
        <p>
          Ground the design in concrete examples. For this problem, strong
          examples usually involve {focusAreaText}. When you describe an
          example, name the request or event, the entities it touches, the data
          store or cache involved, and the response the user or downstream
          system observes.
        </p>
        <p>
          Also make the tradeoffs explicit. Call out how the design avoids{" "}
          {pitfallText}, what consistency guarantees are realistic, and how the
          system behaves during traffic spikes, retries, partial outages, and
          delayed background processing.
        </p>
        {/*<div className="playground-problem-description__examples">
          <h2>Example Scenarios</h2>
          <ul>
            {problem.interviewVariants.map((variant) => (
              <li key={variant}>
                <strong>{variant}</strong>
                <span>
                  Explain how the system would{" "}
                  {lowerFirst(stripTerminalPeriod(variant))}, what changes in
                  the API or data model, and which tradeoff keeps the core path
                  reliable.
                </span>
              </li>
            ))}
          </ul>
        </div>*/}
      </div>
    </article>
  );
};
