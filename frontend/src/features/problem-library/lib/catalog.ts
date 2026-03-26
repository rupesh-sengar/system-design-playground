import type { Difficulty, Problem } from "../model/problem-library";
import type {
  DifficultyCounts,
  ProblemProgress,
  ProblemQuery,
  SortMode,
  StatusFilter,
} from "../model/types";

const difficultyRank: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

export const difficultyGuidance: Record<Difficulty, string> = {
  Easy: "Great for warm-ups, requirement gathering, and foundational tradeoffs.",
  Medium: "Representative interview prompts that need estimations, APIs, and data-path choices.",
  Hard: "Large-scale, multi-system designs that usually demand deeper tradeoff analysis.",
};

export const getDifficultyClassName = (difficulty: Difficulty): string => difficulty.toLowerCase();

const buildSearchDocument = (problem: Problem): string =>
  [
    problem.title,
    problem.category,
    problem.summary,
    problem.scale,
    ...problem.focusAreas,
    ...problem.pitfalls,
    ...problem.interviewVariants,
  ]
    .join(" ")
    .toLowerCase();

const matchesStatus = (
  problem: Problem,
  status: StatusFilter,
  progress: ProblemProgress,
): boolean => {
  if (status === "bookmarked") {
    return progress.bookmarkedIds.has(problem.id);
  }

  if (status === "practiced") {
    return progress.practicedIds.has(problem.id);
  }

  if (status === "unpracticed") {
    return !progress.practicedIds.has(problem.id);
  }

  return true;
};

export const filterProblems = (
  problemList: Problem[],
  query: ProblemQuery,
  progress: ProblemProgress,
): Problem[] => {
  const normalizedSearch = query.search.trim().toLowerCase();

  return problemList.filter((problem) => {
    const matchesSearch =
      normalizedSearch.length === 0 || buildSearchDocument(problem).includes(normalizedSearch);
    const matchesCategory = query.category === "All" || problem.category === query.category;
    const matchesDifficulty =
      query.difficulty === "All" || problem.difficulty === query.difficulty;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesDifficulty &&
      matchesStatus(problem, query.status, progress)
    );
  });
};

export const sortProblems = (
  problemList: Problem[],
  sortBy: SortMode,
  progress: ProblemProgress,
): Problem[] => {
  return [...problemList].sort((left, right) => {
    if (sortBy === "title") {
      return left.title.localeCompare(right.title);
    }

    if (sortBy === "category") {
      const categorySort = left.category.localeCompare(right.category);
      return categorySort || left.title.localeCompare(right.title);
    }

    if (sortBy === "difficulty") {
      const difficultySort = difficultyRank[left.difficulty] - difficultyRank[right.difficulty];
      return difficultySort || left.title.localeCompare(right.title);
    }

    const bookmarkSort =
      Number(progress.bookmarkedIds.has(right.id)) - Number(progress.bookmarkedIds.has(left.id));
    const practicedSort =
      Number(progress.practicedIds.has(left.id)) - Number(progress.practicedIds.has(right.id));
    const difficultySort = difficultyRank[left.difficulty] - difficultyRank[right.difficulty];

    return bookmarkSort || practicedSort || difficultySort || left.title.localeCompare(right.title);
  });
};

export const countProblemsByDifficulty = (problemList: Problem[]): DifficultyCounts =>
  problemList.reduce<DifficultyCounts>(
    (counts, problem) => {
      counts[problem.difficulty] += 1;
      return counts;
    },
    {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    },
  );

export const getVisibleCategoryCount = (problemList: Problem[]): number =>
  new Set(problemList.map((problem) => problem.category)).size;

export const resolveSelectedProblemId = (
  problemList: Problem[],
  selectedProblemId: string | null,
): string | null => {
  if (problemList.length === 0) {
    return null;
  }

  if (selectedProblemId && problemList.some((problem) => problem.id === selectedProblemId)) {
    return selectedProblemId;
  }

  return problemList[0].id;
};
