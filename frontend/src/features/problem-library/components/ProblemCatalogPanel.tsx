import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowUpDown,
  BookOpenCheck,
  ChevronDown,
  Folders,
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

interface DropdownOption<TValue extends string> {
  label: string;
  value: TValue;
}

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

const sortOptions: Array<DropdownOption<SortMode>> = [
  { label: "Recommended", value: "recommended" },
  { label: "Difficulty", value: "difficulty" },
  { label: "Title", value: "title" },
  { label: "Category", value: "category" },
];

interface FilterDropdownProps<TValue extends string> {
  icon: ReactNode;
  id: string;
  label: string;
  options: Array<DropdownOption<TValue>>;
  value: TValue;
  onChange: (value: TValue) => void;
}

const FilterDropdown = <TValue extends string,>({
  icon,
  id,
  label,
  options,
  value,
  onChange,
}: FilterDropdownProps<TValue>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex] ?? options[0];
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        containerRef.current.contains(event.target)
      ) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const selectOption = (index: number): void => {
    const option = options[index];

    if (!option) {
      return;
    }

    onChange(option.value);
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!isOpen) {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setActiveIndex(selectedIndex);
        setIsOpen(true);
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((currentIndex) => (currentIndex + 1) % options.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (currentIndex) => (currentIndex - 1 + options.length) % options.length,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(activeIndex);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      containerRef.current?.contains(nextTarget)
    ) {
      return;
    }

    setIsOpen(false);
  };

  return (
    <div className="field">
      <span id={`${id}-label`}>{label}</span>
      <div
        ref={containerRef}
        className={`field-dropdown ${isOpen ? "field-dropdown--open" : ""}`}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        <button
          ref={triggerRef}
          aria-activedescendant={
            isOpen ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={`${id}-label ${id}-value`}
          className="field__control field__control--dropdown"
          role="combobox"
          type="button"
          onClick={() => {
            setActiveIndex(selectedIndex);
            setIsOpen((currentValue) => !currentValue);
          }}
        >
          {icon}
          <span className="field-dropdown__value" id={`${id}-value`}>
            {selectedOption?.label}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="field__chevron"
            size={15}
            strokeWidth={2}
          />
        </button>

        {isOpen ? (
          <div
            aria-labelledby={`${id}-label`}
            className="field-dropdown__menu"
            id={listboxId}
            role="listbox"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                aria-selected={option.value === value}
                className={`field-dropdown__option ${
                  index === activeIndex ? "field-dropdown__option--active" : ""
                } ${
                  option.value === value
                    ? "field-dropdown__option--selected"
                    : ""
                }`}
                id={`${listboxId}-option-${index}`}
                role="option"
                tabIndex={-1}
                type="button"
                onClick={() => selectOption(index)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

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

  const categoryOptions: Array<DropdownOption<string>> = categories.map(
    (category) => ({
      label: category,
      value: category,
    }),
  );

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
              <div className="field__control field__control--search">
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

            <FilterDropdown
              icon={<Folders aria-hidden="true" size={15} strokeWidth={2} />}
              id="category-filter"
              label="Category"
              options={categoryOptions}
              value={filters.category}
              onChange={onCategoryChange}
            />

            <FilterDropdown
              icon={
                <ArrowUpDown aria-hidden="true" size={15} strokeWidth={2} />
              }
              id="sort-filter"
              label="Sort"
              options={sortOptions}
              value={filters.sortBy}
              onChange={onSortChange}
            />
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
