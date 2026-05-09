import { stageIds, type ProblemContext, type StageId } from "../../ai/contracts.js";
import { getCuratedStageRubric } from "../rubrics/curated-stage.registry.js";
import type { RequirementCheck, StageRubric } from "../types.js";

export type JudgeReferenceChunkType =
  | "anti_pattern"
  | "preferred_solution"
  | "rubric_check";

export type PreferredSolutionChunk = {
  chunkType: JudgeReferenceChunkType;
  content: string;
  criterionId: string;
  metadata?: Record<string, unknown>;
  problemId: string;
  rubricVersion: string;
  stageId: StageId;
};

type RubricCheckCategory = "functional" | "nonFunctional" | "scope";

type CategorizedCheck = {
  category: RubricCheckCategory;
  check: RequirementCheck;
};

const stageLabels: Record<StageId, string> = {
  "api-interface": "API interface",
  "core-entities": "core entities",
  "data-flow": "data flow",
  "deep-dives": "deep dives",
  "high-level-design": "high-level design",
  requirements: "requirements",
};

const unique = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const collectChecks = (rubric: StageRubric): CategorizedCheck[] => [
  ...rubric.functional.map((check) => ({
    category: "functional" as const,
    check,
  })),
  ...rubric.nonFunctional.map((check) => ({
    category: "nonFunctional" as const,
    check,
  })),
  ...rubric.scopeChecks.map((check) => ({
    category: "scope" as const,
    check,
  })),
];

const buildReferenceContent = (
  problem: ProblemContext,
  stageId: StageId,
  category: RubricCheckCategory,
  check: RequirementCheck,
): string => {
  const terms = unique([
    ...check.keywords,
    ...(check.synonyms ?? []),
    ...(check.vectorPhrases ?? []),
  ]);
  const quantificationText = check.requiresQuantification
    ? ` It should quantify this criterion using concrete values such as ${[
        ...(check.quantificationHints ?? []),
        problem.scale,
      ]
        .filter(Boolean)
        .join(", ")}.`
    : "";

  return [
    `Problem: ${problem.title}.`,
    `Stage: ${stageLabels[stageId]}.`,
    `Criterion: ${check.label}.`,
    `Category: ${category}.`,
    check.description ? `Expected coverage: ${check.description}` : null,
    `A strong industry-standard answer should ${check.improvementSuggestion.toLowerCase()}`,
    `It should be able to answer: ${check.followUpQuestion}`,
    terms.length > 0 ? `Relevant concepts: ${terms.join(", ")}.` : null,
    quantificationText.trim() || null,
    `Prompt scale: ${problem.scale}.`,
  ]
    .filter((item): item is string => Boolean(item))
    .join(" ");
};

const buildChunk = (
  problem: ProblemContext,
  rubric: StageRubric,
  category: RubricCheckCategory,
  check: RequirementCheck,
): PreferredSolutionChunk => ({
  chunkType: "preferred_solution",
  content: buildReferenceContent(problem, rubric.stageId, category, check),
  criterionId: check.id,
  metadata: {
    category,
    importance: check.importance,
    keywords: check.keywords,
    label: check.label,
    problemCategory: problem.category,
    problemFocusAreas: problem.focusAreas,
    requiresQuantification: Boolean(check.requiresQuantification),
    source: "generated-from-curated-rubric",
    weight: check.weight,
  },
  problemId: problem.id,
  rubricVersion: rubric.version,
  stageId: rubric.stageId,
});

const buildProblemChunks = (problem: ProblemContext): PreferredSolutionChunk[] =>
  stageIds.flatMap((stageId) => {
    const rubric = getCuratedStageRubric(problem, stageId);

    if (!rubric) {
      return [];
    }

    return collectChecks(rubric).map(({ category, check }) =>
      buildChunk(problem, rubric, category, check),
    );
  });

export const buildPreferredSolutionChunks = (
  problems: ProblemContext[],
): PreferredSolutionChunk[] => problems.flatMap(buildProblemChunks);
