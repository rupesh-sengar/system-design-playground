import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppAuth } from "@/features/auth/app-auth";
import { getApiErrorMessage } from "@/shared/api/http";
import { useToast } from "@/shared/toast/toast-provider";
import {
  useGetProblemProgressQuery,
  useResetProblemProgressMutation,
  useUpdateProblemProgressMutation,
} from "../api/problemProgressApi";
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
  type ProblemLibraryPersistenceState,
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
  persistence: ProblemLibraryPersistenceState;
  practicedIds: Set<string>;
  selectedProblem: Problem | null;
  selectedProblemId: string | null;
  visibleProblems: Problem[];
}

export const useProblemLibrary = (): ProblemLibraryViewModel => {
  const { isApiAuthReady } = useAppAuth();
  const toast = useToast();
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
  const {
    data: remoteProgressEntries = [],
    error: remoteProgressError,
    isFetching: isRemoteProgressFetching,
    isLoading: isRemoteProgressLoading,
  } = useGetProblemProgressQuery(undefined, {
    skip: !isApiAuthReady,
  });
  const [triggerUpdateProblemProgress, updateProblemProgressState] =
    useUpdateProblemProgressMutation();
  const [triggerResetProblemProgress, resetProblemProgressState] =
    useResetProblemProgressMutation();
  const lastRemoteProgressErrorRef = useRef<string | null>(null);

  const remoteProgress = useMemo<ProblemProgress>(() => {
    const bookmarkedIds = new Set<string>();
    const practicedIds = new Set<string>();

    for (const entry of remoteProgressEntries) {
      if (entry.isBookmarked) {
        bookmarkedIds.add(entry.problemId);
      }

      if (entry.isPracticed) {
        practicedIds.add(entry.problemId);
      }
    }

    return {
      bookmarkedIds,
      practicedIds,
    };
  }, [remoteProgressEntries]);

  const progress = useMemo<ProblemProgress>(() => {
    if (isApiAuthReady) {
      return remoteProgress;
    }

    return {
      bookmarkedIds: bookmarked.values,
      practicedIds: practiced.values,
    };
  }, [bookmarked.values, isApiAuthReady, practiced.values, remoteProgress]);

  useEffect(() => {
    if (!isApiAuthReady || !remoteProgressError) {
      lastRemoteProgressErrorRef.current = null;
      return;
    }

    const message = getApiErrorMessage(
      remoteProgressError,
      "Unable to load saved progress.",
    );

    if (message === lastRemoteProgressErrorRef.current) {
      return;
    }

    lastRemoteProgressErrorRef.current = message;
    toast.error(message, {
      dedupeKey: "problem-progress-load-error",
      title: "Progress Sync Failed",
    });
  }, [isApiAuthReady, remoteProgressError, toast]);

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
      practicedCount: progress.practicedIds.size,
      bookmarkedCount: progress.bookmarkedIds.size,
      visibleCategoryCount: getVisibleCategoryCount(visibleProblems),
      totalDifficultyCounts: TOTAL_DIFFICULTY_COUNTS,
      filteredDifficultyCounts: difficultyCounts,
    }),
    [
      baseFilteredProblems.length,
      difficultyCounts,
      progress.bookmarkedIds.size,
      progress.practicedIds.size,
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

  const toggleRemoteProgress = async (
    problemId: string,
    nextProgress: {
      isBookmarked?: boolean;
      isPracticed?: boolean;
    },
  ): Promise<void> => {
    try {
      await triggerUpdateProblemProgress({
        problemId,
        ...nextProgress,
      }).unwrap();

      if (nextProgress.isBookmarked !== undefined) {
        toast.success(
          nextProgress.isBookmarked ? "Bookmark saved." : "Bookmark removed.",
          {
            title: "Library Updated",
          },
        );
        return;
      }

      if (nextProgress.isPracticed !== undefined) {
        toast.success(
          nextProgress.isPracticed
            ? "Problem marked as practiced."
            : "Problem marked as unpracticed.",
          {
            title: "Practice Status Updated",
          },
        );
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Unable to update saved progress."),
        {
          dedupeKey: "problem-progress-update-error",
          title: "Progress Update Failed",
        },
      );
    }
  };

  const toggleBookmark = (problemId: string): void => {
    if (!isApiAuthReady) {
      bookmarked.toggle(problemId);
      return;
    }

    void toggleRemoteProgress(problemId, {
      isBookmarked: !progress.bookmarkedIds.has(problemId),
    });
  };

  const togglePracticed = (problemId: string): void => {
    if (!isApiAuthReady) {
      practiced.toggle(problemId);
      return;
    }

    void toggleRemoteProgress(problemId, {
      isPracticed: !progress.practicedIds.has(problemId),
    });
  };

  const resetProgress = async (): Promise<void> => {
    const shouldReset = window.confirm(
      isApiAuthReady
        ? "Clear bookmarked and practiced progress saved to your account?"
        : "Clear bookmarked and practiced progress for this browser?",
    );

    if (!shouldReset) {
      return;
    }

    if (!isApiAuthReady) {
      bookmarked.clear();
      practiced.clear();
      return;
    }

    try {
      await triggerResetProblemProgress().unwrap();
      toast.success("Saved progress cleared.", {
        title: "Progress Reset",
      });
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Unable to reset saved progress."),
        {
          dedupeKey: "problem-progress-reset-error",
          title: "Progress Reset Failed",
        },
      );
    }
  };

  const persistenceErrorSource =
    updateProblemProgressState.error ??
    resetProblemProgressState.error ??
    remoteProgressError;
  const persistence = useMemo<ProblemLibraryPersistenceState>(
    () => ({
      errorMessage: persistenceErrorSource
        ? getApiErrorMessage(
            persistenceErrorSource,
            "Unable to sync saved progress.",
          )
        : null,
      isLoading: isApiAuthReady
        ? isRemoteProgressLoading || isRemoteProgressFetching
        : false,
      isRemote: isApiAuthReady,
      isSyncing:
        updateProblemProgressState.isLoading || resetProblemProgressState.isLoading,
    }),
    [
      isApiAuthReady,
      isRemoteProgressFetching,
      isRemoteProgressLoading,
      persistenceErrorSource,
      resetProblemProgressState.isLoading,
      updateProblemProgressState.isLoading,
    ],
  );

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
      toggleBookmark,
      togglePracticed,
    },
    bookmarkedIds: progress.bookmarkedIds,
    categories,
    difficultyCounts,
    difficultyLevels,
    filters,
    metrics,
    pagination,
    paginatedProblems,
    persistence,
    practicedIds: progress.practicedIds,
    selectedProblem,
    selectedProblemId,
    visibleProblems,
  };
};
