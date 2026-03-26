import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  countProblemsByDifficulty,
  filterProblems,
  getVisibleCategoryCount,
  resolveSelectedProblemId,
  sortProblems,
} from "../lib/catalog";
import {
  categories,
  difficultyLevels,
  problems,
} from "../model/problem-library";
import type { DifficultyFilter, Problem } from "../model/problem-library";
import {
  defaultCatalogFilters,
  type CatalogFilters,
  type ProblemCatalogPagination,
  type DifficultyCounts,
  type ProblemLibraryMetrics,
  type ProblemProgress,
  type SortMode,
  type StatusFilter,
} from "../model/types";
import { usePersistentIdSet } from "./usePersistentIdSet";

const STORAGE_KEYS = {
  bookmarked: "system-design-lab.bookmarked",
  practiced: "system-design-lab.practiced",
} as const;

const PROBLEMS_PER_PAGE = 8;
const TOTAL_DIFFICULTY_COUNTS = countProblemsByDifficulty(problems);

interface ProblemLibraryActions {
  clearFilters: () => void;
  setCurrentPage: (page: number) => void;
  pickRandomProblem: () => void;
  resetProgress: () => void;
  selectProblem: (problemId: string) => void;
  setCategory: (category: string) => void;
  setDifficulty: (difficulty: DifficultyFilter) => void;
  setSearch: (search: string) => void;
  setSortBy: (sortBy: SortMode) => void;
  setStatus: (status: StatusFilter) => void;
  toggleBookmark: (problemId: string) => void;
  togglePracticed: (problemId: string) => void;
}

export interface ProblemLibraryViewModel {
  actions: ProblemLibraryActions;
  bookmarkedIds: Set<string>;
  categories: string[];
  difficultyCounts: DifficultyCounts;
  difficultyLevels: DifficultyFilter[];
  filters: CatalogFilters;
  metrics: ProblemLibraryMetrics;
  pagination: ProblemCatalogPagination;
  paginatedProblems: Problem[];
  practicedIds: Set<string>;
  selectedProblem: Problem | null;
  selectedProblemId: string | null;
  visibleProblems: Problem[];
}

export const useProblemLibrary = (): ProblemLibraryViewModel => {
  const [filters, setFilters] = useState<CatalogFilters>({
    ...defaultCatalogFilters,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    problems[0]?.id ?? null,
  );
  const deferredSearch = useDeferredValue(filters.search);
  const bookmarked = usePersistentIdSet(STORAGE_KEYS.bookmarked);
  const practiced = usePersistentIdSet(STORAGE_KEYS.practiced);

  const progress = useMemo<ProblemProgress>(
    () => ({
      bookmarkedIds: bookmarked.values,
      practicedIds: practiced.values,
    }),
    [bookmarked.values, practiced.values],
  );

  const baseFilteredProblems = useMemo(
    () =>
      filterProblems(
        problems,
        {
          search: deferredSearch,
          difficulty: "All",
          category: filters.category,
          status: filters.status,
        },
        progress,
      ),
    [deferredSearch, filters.category, filters.status, progress],
  );

  const visibleProblems = useMemo(
    () =>
      sortProblems(
        filterProblems(
          baseFilteredProblems,
          {
            search: "",
            difficulty: filters.difficulty,
            category: "All",
            status: "all",
          },
          progress,
        ),
        filters.sortBy,
        progress,
      ),
    [baseFilteredProblems, filters.difficulty, filters.sortBy, progress],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    deferredSearch,
    filters.category,
    filters.difficulty,
    filters.sortBy,
    filters.status,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleProblems.length / PROBLEMS_PER_PAGE),
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProblems = useMemo(() => {
    const startIndex = (currentPage - 1) * PROBLEMS_PER_PAGE;
    const endIndex = startIndex + PROBLEMS_PER_PAGE;

    return visibleProblems.slice(startIndex, endIndex);
  }, [currentPage, visibleProblems]);

  useEffect(() => {
    const nextSelectedProblemId = resolveSelectedProblemId(
      paginatedProblems,
      selectedProblemId,
    );

    if (nextSelectedProblemId !== selectedProblemId) {
      setSelectedProblemId(nextSelectedProblemId);
    }
  }, [paginatedProblems, selectedProblemId]);

  const selectedProblem = useMemo(
    () =>
      paginatedProblems.find((problem) => problem.id === selectedProblemId) ??
      null,
    [paginatedProblems, selectedProblemId],
  );

  const difficultyCounts = useMemo(
    () => countProblemsByDifficulty(baseFilteredProblems),
    [baseFilteredProblems],
  );

  const metrics = useMemo<ProblemLibraryMetrics>(
    () => ({
      totalProblems: problems.length,
      baseFilteredCount: baseFilteredProblems.length,
      visibleCount: visibleProblems.length,
      practicedCount: practiced.values.size,
      bookmarkedCount: bookmarked.values.size,
      visibleCategoryCount: getVisibleCategoryCount(visibleProblems),
      totalDifficultyCounts: TOTAL_DIFFICULTY_COUNTS,
      filteredDifficultyCounts: difficultyCounts,
    }),
    [
      baseFilteredProblems.length,
      bookmarked.values.size,
      difficultyCounts,
      practiced.values.size,
      visibleProblems,
      visibleProblems.length,
    ],
  );

  const pagination = useMemo<ProblemCatalogPagination>(() => {
    const pageStart =
      visibleProblems.length === 0
        ? 0
        : (currentPage - 1) * PROBLEMS_PER_PAGE + 1;
    const pageEnd = Math.min(
      currentPage * PROBLEMS_PER_PAGE,
      visibleProblems.length,
    );

    return {
      currentPage,
      pageEnd,
      pageSize: PROBLEMS_PER_PAGE,
      pageStart,
      totalItems: visibleProblems.length,
      totalPages,
    };
  }, [currentPage, totalPages, visibleProblems.length]);

  const setSearch = (search: string): void => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        search,
      }));
    });
  };

  const setDifficulty = (difficulty: DifficultyFilter): void => {
    setFilters((current) => ({
      ...current,
      difficulty,
    }));
  };

  const setCategory = (category: string): void => {
    setFilters((current) => ({
      ...current,
      category,
    }));
  };

  const setStatus = (status: StatusFilter): void => {
    setFilters((current) => ({
      ...current,
      status,
    }));
  };

  const setSortBy = (sortBy: SortMode): void => {
    setFilters((current) => ({
      ...current,
      sortBy,
    }));
  };

  const selectProblem = (problemId: string): void => {
    setSelectedProblemId(problemId);
  };

  const clearFilters = (): void => {
    setFilters({ ...defaultCatalogFilters });
  };

  const updateCurrentPage = (page: number): void => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const pickRandomProblem = (): void => {
    if (visibleProblems.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * visibleProblems.length);
    setSelectedProblemId(visibleProblems[randomIndex].id);
  };

  const resetProgress = (): void => {
    const shouldReset = window.confirm(
      "Clear bookmarked and practiced progress for this browser?",
    );

    if (!shouldReset) {
      return;
    }

    bookmarked.clear();
    practiced.clear();
  };

  return {
    actions: {
      clearFilters,
      setCurrentPage: updateCurrentPage,
      pickRandomProblem,
      resetProgress,
      selectProblem,
      setCategory,
      setDifficulty,
      setSearch,
      setSortBy,
      setStatus,
      toggleBookmark: bookmarked.toggle,
      togglePracticed: practiced.toggle,
    },
    bookmarkedIds: bookmarked.values,
    categories,
    difficultyCounts,
    difficultyLevels,
    filters,
    metrics,
    pagination,
    paginatedProblems,
    practicedIds: practiced.values,
    selectedProblem,
    selectedProblemId,
    visibleProblems,
  };
};
