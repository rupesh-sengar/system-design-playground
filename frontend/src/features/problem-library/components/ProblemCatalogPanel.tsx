import type { ChangeEvent } from "react";
import {
  BookOpenCheck,
  ListFilter,
  RotateCcw,
  Search,
  Shuffle,
} from "lucide-react";
import { FilterPill } from "@/shared/ui/FilterPill";
import { ProblemCard } from "./ProblemCard";
import "@/shared/ui/shared-ui.css";
import "./ProblemCatalogPanel.css";
import type { DifficultyFilter, Problem } from "../model/problem-library";
import type {
  CatalogFilters,
  DifficultyCounts,
  ProblemCatalogPagination,
  ProblemLibraryPersistenceState,
  ProblemLibraryMetrics,
  SortMode,
  StatusFilter,
} from "../model/types";

interface ProblemCatalogPanelProps {
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
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
  onDifficultyChange: (difficulty: DifficultyFilter) => void;
  onPageChange: (page: number) => void;
  onPickRandomProblem: () => void;
  onResetProgress: () => void;
  onSearchChange: (search: string) => void;
  onSelectProblem: (problemId: string) => void;
  onSortChange: (sortBy: SortMode) => void;
  onStatusChange: (status: StatusFilter) => void;
}

const statusOptions: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "bookmarked", label: "Saved" },
  { id: "practiced", label: "Done" },
  { id: "unpracticed", label: "Open" },
];

const buildPaginationItems = (
  currentPage: number,
  totalPages: number,
): Array<number | string> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis-right", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "ellipsis-left",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
};

export const ProblemCatalogPanel = ({
  bookmarkedIds,
  categories,
  difficultyCounts,
  difficultyLevels,
  filters,
  metrics,
  pagination,
  paginatedProblems,
  persistence,
  practicedIds,
  onCategoryChange,
  onClearFilters,
  onDifficultyChange,
  onPageChange,
  onPickRandomProblem,
  onResetProgress,
  onSearchChange,
  onSelectProblem,
  onSortChange,
  onStatusChange,
}: ProblemCatalogPanelProps) => {
  const completionPercent =
    metrics.totalProblems === 0
      ? 0
      : Math.round((metrics.practicedCount / metrics.totalProblems) * 100);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  const handleCategoryChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ): void => {
    onCategoryChange(event.target.value);
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onSortChange(event.target.value as SortMode);
  };

  return (
    <section className="catalog panel" data-tour-target="problem-library">
      <div className="catalog-head">
        <div className="catalog-head__copy">
          <div className="catalog-title">
            <BookOpenCheck aria-hidden="true" size={18} strokeWidth={1.9} />
            <div className="catalog-title__text">
              <h2>Problems</h2>
              <div className="catalog-summary" aria-label="Library summary">
                <span>{metrics.visibleCount} shown</span>
                <span>{metrics.practicedCount} done</span>
                <span>{metrics.bookmarkedCount} saved</span>
                <div
                  aria-label={`${completionPercent}% complete`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={completionPercent}
                  className="catalog-summary__meter"
                  role="meter"
                >
                  <span style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="catalog-head__side">
          <div className="catalog-actions">
            <button
              className="primary-action"
              type="button"
              onClick={onPickRandomProblem}
            >
              <Shuffle aria-hidden="true" size={15} strokeWidth={2} />
              Random
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={onResetProgress}
            >
              <RotateCcw aria-hidden="true" size={15} strokeWidth={2} />
              Reset
            </button>
          </div>
        </div>
      </div>

      <section
        className="catalog-filters"
        aria-label="Problem filters"
        data-tour-target="library-filters"
      >
        <div className="catalog-filters__head">
          <span>
            <ListFilter aria-hidden="true" size={15} strokeWidth={2} />
            Filters
          </span>
        </div>

        <div className="catalog-filters__top">
          <div className="filter-grid">
            <label className="field">
              <span>Search</span>
              <div className="field__control">
                <Search aria-hidden="true" size={15} strokeWidth={2} />
                <input
                  type="search"
                  placeholder="Search"
                  autoComplete="off"
                  value={filters.search}
                  onChange={handleSearchChange}
                />
              </div>
            </label>

            <label className="field">
              <span>Category</span>
              <select value={filters.category} onChange={handleCategoryChange}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Sort</span>
              <select value={filters.sortBy} onChange={handleSortChange}>
                <option value="recommended">Recommended</option>
                <option value="difficulty">Difficulty</option>
                <option value="title">Title</option>
                <option value="category">Category</option>
              </select>
            </label>
          </div>

          <button
            className="secondary-action catalog-filters__clear"
            type="button"
            onClick={onClearFilters}
          >
            Clear
          </button>
        </div>

        <div className="filter-groups">
          <div className="filter-group">
            <span className="filter-group__label">Difficulty</span>
            <div className="pill-row">
              {difficultyLevels.map((level) => (
                <FilterPill
                  key={level}
                  active={filters.difficulty === level}
                  count={
                    level === "All"
                      ? metrics.baseFilteredCount
                      : difficultyCounts[level]
                  }
                  label={level}
                  onClick={() => onDifficultyChange(level)}
                />
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group__label">Status</span>
            <div className="pill-row pill-row--muted">
              {statusOptions.map((status) => (
                <FilterPill
                  key={status.id}
                  active={filters.status === status.id}
                  label={status.label}
                  tone="muted"
                  onClick={() => onStatusChange(status.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="problem-list" data-tour-target="library-problems">
        {paginatedProblems.length > 0 ? (
          paginatedProblems.map((problem) => (
            <ProblemCard
              key={problem.id}
              isBookmarked={bookmarkedIds.has(problem.id)}
              isPracticed={practicedIds.has(problem.id)}
              problem={problem}
              onSelect={() => onSelectProblem(problem.id)}
            />
          ))
        ) : (
          <article className="empty-state">
            <h3>No matches.</h3>
            <button
              className="secondary-action"
              type="button"
              onClick={onClearFilters}
            >
              Clear
            </button>
          </article>
        )}
      </div>

      {pagination.totalItems > 0 ? (
        <div className="catalog-pagination">
          <p className="catalog-pagination__summary">
            {pagination.pageStart}-{pagination.pageEnd} /{" "}
            {pagination.totalItems}
          </p>

          <div className="catalog-pagination__controls">
            <button
              className="secondary-action catalog-pagination__button"
              type="button"
              disabled={pagination.currentPage === 1}
              onClick={() => onPageChange(pagination.currentPage - 1)}
            >
              Previous
            </button>

            <div className="catalog-pagination__pages">
              {buildPaginationItems(
                pagination.currentPage,
                pagination.totalPages,
              ).map((item) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    className={`catalog-pagination__page ${
                      pagination.currentPage === item
                        ? "catalog-pagination__page--active"
                        : ""
                    }`}
                    type="button"
                    onClick={() => onPageChange(item)}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} className="catalog-pagination__ellipsis">
                    ...
                  </span>
                ),
              )}
            </div>

            <button
              className="secondary-action catalog-pagination__button"
              type="button"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => onPageChange(pagination.currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
