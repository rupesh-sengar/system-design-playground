import type { Difficulty, DifficultyFilter, Problem } from "./problem-library";

export type { Difficulty, DifficultyFilter, Problem };

export type StatusFilter = "all" | "bookmarked" | "practiced" | "unpracticed";
export type SortMode = "recommended" | "difficulty" | "title" | "category";

export interface ProblemQuery {
  search: string;
  difficulty: DifficultyFilter;
  category: string;
  status: StatusFilter;
}

export interface CatalogFilters extends ProblemQuery {
  sortBy: SortMode;
}

export interface ProblemProgress {
  bookmarkedIds: Set<string>;
  practicedIds: Set<string>;
}

export type DifficultyCounts = Record<Difficulty, number>;

export interface ProblemCatalogPagination {
  currentPage: number;
  pageEnd: number;
  pageSize: number;
  pageStart: number;
  totalItems: number;
  totalPages: number;
}

export interface ProblemLibraryMetrics {
  totalProblems: number;
  baseFilteredCount: number;
  visibleCount: number;
  practicedCount: number;
  bookmarkedCount: number;
  visibleCategoryCount: number;
  totalDifficultyCounts: DifficultyCounts;
  filteredDifficultyCounts: DifficultyCounts;
}

export interface ProblemLibraryPersistenceState {
  errorMessage: string | null;
  isLoading: boolean;
  isRemote: boolean;
  isSyncing: boolean;
}

export const defaultCatalogFilters: CatalogFilters = {
  search: "",
  difficulty: "All",
  category: "All",
  status: "all",
  sortBy: "recommended",
};
