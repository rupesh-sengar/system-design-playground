import {
  findProblemById,
  HeroSection,
  ProblemCatalogPanel,
  ProblemDetailPanel,
  useProblemLibrary,
} from "@/features/problem-library";
import { useAppRoute } from "@/app/router";
import { PracticePlaygroundPage } from "@/features/practice-playground";

export default function App() {
  const { goToLibrary, goToPlayground, route } = useAppRoute();
  const {
    actions,
    bookmarkedIds,
    categories,
    difficultyCounts,
    difficultyLevels,
    filters,
    metrics,
    paginatedProblems,
    pagination,
    practicedIds,
    selectedProblem,
    selectedProblemId,
    visibleProblems,
  } = useProblemLibrary();
  const routeProblem =
    route.name === "playground" ? findProblemById(route.problemId) : null;

  const handlePickRandomProblem = (): void => {
    if (visibleProblems.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * visibleProblems.length);
    const randomProblem = visibleProblems[randomIndex];
    actions.selectProblem(randomProblem.id);
    goToPlayground(randomProblem.id);
  };

  const handleSelectProblem = (problemId: string): void => {
    actions.selectProblem(problemId);
  };

  if (route.name === "playground") {
    return (
      <div className="shell shell--playground">
        <PracticePlaygroundPage
          isPracticed={routeProblem ? practicedIds.has(routeProblem.id) : false}
          problem={routeProblem}
          onBack={goToLibrary}
          onMarkPracticed={() => {
            if (!routeProblem || practicedIds.has(routeProblem.id)) {
              return;
            }

            actions.togglePracticed(routeProblem.id);
          }}
        />
      </div>
    );
  }

  return (
    <div className="shell">
      <HeroSection
        metrics={metrics}
        onPickRandomProblem={handlePickRandomProblem}
        onResetProgress={actions.resetProgress}
      />

      <main className="workspace">
        <ProblemCatalogPanel
          bookmarkedIds={bookmarkedIds}
          categories={categories}
          difficultyCounts={difficultyCounts}
          difficultyLevels={difficultyLevels}
          filters={filters}
          metrics={metrics}
          paginatedProblems={paginatedProblems}
          pagination={pagination}
          practicedIds={practicedIds}
          selectedProblemId={selectedProblemId}
          onCategoryChange={actions.setCategory}
          onClearFilters={actions.clearFilters}
          onDifficultyChange={actions.setDifficulty}
          onPageChange={actions.setCurrentPage}
          onSearchChange={actions.setSearch}
          onSelectProblem={handleSelectProblem}
          onSortChange={actions.setSortBy}
          onStatusChange={actions.setStatus}
        />

        <aside className="detail panel">
          <ProblemDetailPanel
            isBookmarked={
              selectedProblem ? bookmarkedIds.has(selectedProblem.id) : false
            }
            isPracticed={
              selectedProblem ? practicedIds.has(selectedProblem.id) : false
            }
            onOpenPlayground={() => {
              if (!selectedProblem) {
                return;
              }

              goToPlayground(selectedProblem.id);
            }}
            problem={selectedProblem}
            onToggleBookmark={() => {
              if (!selectedProblem) {
                return;
              }

              actions.toggleBookmark(selectedProblem.id);
            }}
            onTogglePracticed={() => {
              if (!selectedProblem) {
                return;
              }

              actions.togglePracticed(selectedProblem.id);
            }}
          />
        </aside>
      </main>
    </div>
  );
}
