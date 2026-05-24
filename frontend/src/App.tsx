import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AlertTriangle, BookOpenCheck } from "lucide-react";
import {
  findProblemById,
  ProblemCatalogPanel,
  problems,
  useProblemLibrary,
} from "@/features/problem-library";
import { LandingPage } from "@/features/landing";
import {
  NewUserTutorial,
  type TutorialRouteTarget,
} from "@/features/onboarding";
import { AuthSessionControl } from "@/features/auth/components/AuthSessionControl";
import { ThemeModeControl } from "@/features/theme/components/ThemeModeControl";
import { useAppRoute } from "@/app/router";
import {
  PracticePlaygroundPage,
  type PlaygroundSaveStatus,
} from "@/features/practice-playground";
import "@/app/app-shell.css";
import "@/shared/ui/shared-ui.css";
import "@/styles/theme-overhaul.css";

const NEW_USER_TUTORIAL_STORAGE_KEY =
  "system-design-lab.new-user-tutorial.seen.v1";

export default function App() {
  const { goToHome, goToLibrary, goToPlayground, route } = useAppRoute();
  const [playgroundSaveStatus, setPlaygroundSaveStatus] =
    useState<PlaygroundSaveStatus | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
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
    persistence,
    practicedIds,
    visibleProblems,
  } = useProblemLibrary();
  const routeProblem =
    route.name === "playground" ? findProblemById(route.problemId) : null;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(NEW_USER_TUTORIAL_STORAGE_KEY)) {
        return;
      }

      setIsTutorialOpen(true);
    } catch {
      setIsTutorialOpen(true);
    }
  }, []);

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

  const handleCloseTutorial = useCallback((): void => {
    setIsTutorialOpen(false);

    try {
      window.localStorage.setItem(NEW_USER_TUTORIAL_STORAGE_KEY, "true");
    } catch {
      // The tutorial can still be used if storage is unavailable.
    }
  }, []);

  const handleTutorialNavigate = useCallback(
    (targetRoute: TutorialRouteTarget): void => {
      if (targetRoute === "home") {
        goToHome();
        return;
      }

      if (targetRoute === "library") {
        goToLibrary();
        return;
      }

      const starterProblem = routeProblem ?? visibleProblems[0] ?? problems[0];

      if (!starterProblem) {
        goToLibrary();
        return;
      }

      actions.selectProblem(starterProblem.id);
      goToPlayground(starterProblem.id);
    },
    [
      actions,
      goToHome,
      goToLibrary,
      goToPlayground,
      routeProblem,
      visibleProblems,
    ],
  );

  const toolbarContext =
    route.name === "home"
      ? "Home"
      : route.name === "playground"
        ? "Practice Playground"
        : "Problem Library";

  useEffect(() => {
    if (route.name !== "playground") {
      setPlaygroundSaveStatus(null);
    }
  }, [route.name]);

  const renderToolbar = (leadingControl?: ReactNode) => (
    <div className="app-toolbar">
      <div className="app-toolbar__left">
        <button
          aria-label="Go to home"
          className="app-toolbar__brand"
          type="button"
          onClick={goToHome}
        >
          <p className="eyebrow">System Design Lab</p>
          <span>{toolbarContext}</span>
        </button>
      </div>

      <div className="app-toolbar__controls">
        {leadingControl}
        <button
          className="secondary-action app-toolbar__tutorial"
          type="button"
          onClick={() => setIsTutorialOpen(true)}
        >
          <BookOpenCheck aria-hidden="true" size={15} strokeWidth={2} />
          Guide
        </button>
        {route.name !== "playground" && persistence.errorMessage ? (
          <span
            aria-label={persistence.errorMessage}
            className="app-toolbar__sync-status"
            role="status"
            title={persistence.errorMessage}
          >
            <AlertTriangle aria-hidden="true" size={14} strokeWidth={2} />
            Sync issue
          </span>
        ) : null}
        <ThemeModeControl />
        <AuthSessionControl />
      </div>
    </div>
  );

  const renderTutorial = () => (
    <NewUserTutorial
      currentRoute={route.name}
      isOpen={isTutorialOpen}
      onClose={handleCloseTutorial}
      onNavigate={handleTutorialNavigate}
    />
  );

  if (route.name === "playground") {
    return (
      <div className="shell shell--playground">
        {renderToolbar(
          playgroundSaveStatus ? (
            <span
              className={`app-toolbar__save-status app-toolbar__save-status--${playgroundSaveStatus.statusTone}`}
            >
              {playgroundSaveStatus.statusLabel}
            </span>
          ) : null,
        )}

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
          onSaveStatusChange={setPlaygroundSaveStatus}
        />
        {renderTutorial()}
      </div>
    );
  }

  if (route.name === "home") {
    return (
      <div className="shell shell--landing">
        {renderToolbar()}

        <LandingPage
          categories={categories}
          featuredProblems={problems.slice(0, 3)}
          metrics={metrics}
          practicedIds={practicedIds}
          onOpenLibrary={goToLibrary}
          onPickRandomProblem={handlePickRandomProblem}
          onSelectProblem={handleSelectProblem}
        />
        {renderTutorial()}
      </div>
    );
  }

  return (
    <div className="shell">
      {renderToolbar()}

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
          persistence={persistence}
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
      {renderTutorial()}
    </div>
  );
}
