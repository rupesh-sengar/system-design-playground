import {
  findProblemById,
  ProblemCatalogPanel,
  useProblemLibrary,
} from "@/features/problem-library";
import { AuthSessionControl } from "@/features/auth/components/AuthSessionControl";
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
    goToPlayground(problemId);
  };

  const toolbarContext =
    route.name === "playground" ? "Practice Playground" : "Problem Library";

  if (route.name === "playground") {
    return (
      <div className="shell shell--playground">
        <div className="app-toolbar">
          <div className="app-toolbar__brand">
            <p className="eyebrow">System Design Lab</p>
            <span>{toolbarContext}</span>
          </div>
          <AuthSessionControl />
        </div>

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
      <div className="app-toolbar">
        <div className="app-toolbar__brand">
          <p className="eyebrow">System Design Lab</p>
          <span>{toolbarContext}</span>
        </div>
        <AuthSessionControl />
      </div>

      <main className="workspace workspace--library-only">
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
          onCategoryChange={actions.setCategory}
          onClearFilters={actions.clearFilters}
          onDifficultyChange={actions.setDifficulty}
          onPageChange={actions.setCurrentPage}
          onPickRandomProblem={handlePickRandomProblem}
          onResetProgress={actions.resetProgress}
          onSearchChange={actions.setSearch}
          onSelectProblem={handleSelectProblem}
          onSortChange={actions.setSortBy}
          onStatusChange={actions.setStatus}
        />
      </main>
    </div>
  );
}
