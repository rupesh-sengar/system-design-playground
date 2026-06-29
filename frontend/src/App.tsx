import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import {
  findProblemById,
  isFreeStarterProblem,
  ProblemCatalogPanel,
  problems,
  useProblemLibrary,
} from "@/features/problem-library";
import { LandingPage } from "@/features/landing";
import { IssueReportDialog } from "@/features/issue-reporting";
import { AccountBillingPage, PricingPage } from "@/features/billing";
import {
  NewUserTutorial,
  OnboardingPage,
  type TutorialRouteTarget,
} from "@/features/onboarding";
import { useAppAuth } from "@/features/auth/app-auth";
import { AuthReturnNotice } from "@/features/auth/components/AuthReturnNotice";
import { AuthSessionControl } from "@/features/auth/components/AuthSessionControl";
import { ThemeModeControl } from "@/features/theme/components/ThemeModeControl";
import { useAppRoute } from "@/app/router";
import {
  PracticePlaygroundPage,
  type PlaygroundSaveStatus,
} from "@/features/practice-playground";
import { frontendConfig } from "@/config/env";
import { NoticeDialog } from "@/shared/ui/NoticeDialog";
import "@/app/app-shell.css";
import "@/shared/ui/shared-ui.css";
import "@/styles/theme-overhaul.css";

const NEW_USER_TUTORIAL_STORAGE_KEY =
  "system-design-lab.new-user-tutorial.seen.v1";
const DEVELOPMENT_NOTICE_LABEL = "This site is still in development";

export default function App() {
  const { features } = frontendConfig;
  const { isAuthenticated, userEmail, userName } = useAppAuth();
  const {
    goToAccount,
    goToHome,
    goToLibrary,
    goToPlayground,
    goToPricing,
    route,
  } = useAppRoute();
  const [playgroundSaveStatus, setPlaygroundSaveStatus] =
    useState<PlaygroundSaveStatus | null>(null);
  const [isDevelopmentNoticeOpen, setIsDevelopmentNoticeOpen] = useState(
    features.developmentNotice,
  );
  const [isIssueReportOpen, setIsIssueReportOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const lastNonAccountHashRef = useRef("#/");
  const {
    actions,
    access,
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
    startedIds,
    visibleProblems,
  } = useProblemLibrary();
  const routeProblem =
    route.name === "playground" ? findProblemById(route.problemId) : null;
  const isProblemLocked = (problemId: string): boolean =>
    !access.hasPremiumCatalog && !isFreeStarterProblem(problemId);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsTutorialOpen(false);
      return;
    }

    try {
      if (window.localStorage.getItem(NEW_USER_TUTORIAL_STORAGE_KEY)) {
        return;
      }

      setIsTutorialOpen(true);
    } catch {
      setIsTutorialOpen(true);
    }
  }, [isAuthenticated]);

  const handlePickRandomProblem = (): void => {
    const randomProblemCandidates = visibleProblems.filter(
      (problem) => !isProblemLocked(problem.id),
    );

    if (randomProblemCandidates.length === 0) {
      return;
    }

    const randomIndex = Math.floor(
      Math.random() * randomProblemCandidates.length,
    );
    const randomProblem = randomProblemCandidates[randomIndex];
    actions.selectProblem(randomProblem.id);

    goToPlayground(randomProblem.id);
  };

  const handleSelectProblem = (problemId: string): void => {
    actions.selectProblem(problemId);

    if (isProblemLocked(problemId)) {
      goToPricing();
      return;
    }

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
        : route.name === "pricing" && features.billing
          ? "Pricing"
          : route.name === "onboarding" && features.onboarding
            ? "Setup"
            : route.name === "account" && features.billing
              ? "Account"
              : "Problem Library";

  useEffect(() => {
    if (route.name !== "playground") {
      setPlaygroundSaveStatus(null);
    }
  }, [route.name]);

  useEffect(() => {
    if (route.name !== "account") {
      lastNonAccountHashRef.current = window.location.hash || "#/";
    }
  }, [route]);

  const handleCloseAccount = useCallback((): void => {
    window.location.hash = lastNonAccountHashRef.current || "#/";
  }, []);

  const renderToolbar = (leadingControl?: ReactNode) => (
    <div className="app-toolbar">
      <div className="app-toolbar__left">
        <button
          aria-label="Go to home"
          className="app-toolbar__brand"
          type="button"
          onClick={goToHome}
        >
          <span className="app-toolbar__brand-mark" aria-hidden="true" />
          <span className="app-toolbar__brand-copy">
            <span className="eyebrow app-toolbar__brand-name">
              System Design Park
            </span>
            <span className="app-toolbar__brand-context">
              {toolbarContext}
            </span>
          </span>
        </button>
      </div>

      <div className="app-toolbar__controls">
        {leadingControl}
        {features.developmentNotice ? (
          <span className="app-toolbar__warning-control">
            <button
              aria-label={DEVELOPMENT_NOTICE_LABEL}
              className="app-toolbar__warning-button"
              type="button"
              onClick={() => setIsDevelopmentNoticeOpen(true)}
            >
              <AlertTriangle aria-hidden="true" size={20} strokeWidth={2} />
            </button>
            <span className="app-toolbar__warning-tooltip" role="tooltip">
              {DEVELOPMENT_NOTICE_LABEL}
            </span>
          </span>
        ) : null}
        <span className="app-toolbar__icon-control">
          <button
            aria-label="Report an issue"
            className="app-toolbar__icon-button"
            type="button"
            onClick={() => setIsIssueReportOpen(true)}
          >
            <Bug aria-hidden="true" size={18} strokeWidth={2} />
          </button>
          <span className="app-toolbar__tooltip" role="tooltip">
            Report issue
          </span>
        </span>
        {features.billing ? (
          <button
            className="secondary-action app-toolbar__tutorial"
            type="button"
            onClick={goToPricing}
          >
            <CreditCard aria-hidden="true" size={15} strokeWidth={2} />
            Pricing
          </button>
        ) : null}
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
        <AuthSessionControl
          onOpenAccount={features.billing ? goToAccount : undefined}
          onOpenGuide={
            isAuthenticated ? () => setIsTutorialOpen(true) : undefined
          }
          showGuestSignupPrompt={route.name === "home"}
        />
      </div>
    </div>
  );

  const renderHeader = (leadingControl?: ReactNode) => (
    <>
      {renderToolbar(leadingControl)}
      <AuthReturnNotice />
    </>
  );

  const renderTutorial = () => (
    <NewUserTutorial
      currentRoute={
        route.name === "home" ||
        route.name === "library" ||
        route.name === "playground"
          ? route.name
          : "home"
      }
      isOpen={isAuthenticated && isTutorialOpen && !isDevelopmentNoticeOpen}
      onClose={handleCloseTutorial}
      onNavigate={handleTutorialNavigate}
    />
  );

  const renderDevelopmentNotice = () => (
    <NoticeDialog
      actionIcon={
        <CheckCircle2 aria-hidden="true" size={16} strokeWidth={2} />
      }
      confirmLabel="I understand"
      description="This application is still being built. Some pages, AI responses, account flows, and billing experiences may be incomplete or change before launch."
      eyebrow="Development Preview"
      icon={<AlertTriangle aria-hidden="true" size={20} strokeWidth={2} />}
      isOpen={isDevelopmentNoticeOpen}
      onConfirm={() => setIsDevelopmentNoticeOpen(false)}
      role="alertdialog"
      title={DEVELOPMENT_NOTICE_LABEL}
      tone="warning"
    >
      <ul className="notice-dialog__list">
        <li>
          Use the app for exploration and practice, but expect rough edges.
        </li>
        <li>Data, feedback, and plan details may be reset or revised.</li>
      </ul>
    </NoticeDialog>
  );

  const renderOverlays = () => (
    <>
      <IssueReportDialog
        isOpen={isIssueReportOpen}
        problemId={route.name === "playground" ? route.problemId : null}
        problemTitle={routeProblem?.title ?? null}
        reporterEmail={isAuthenticated ? userEmail : null}
        reporterName={isAuthenticated ? userName : null}
        routeName={route.name}
        onClose={() => setIsIssueReportOpen(false)}
      />
      {renderTutorial()}
      {renderDevelopmentNotice()}
    </>
  );

  if (route.name === "playground") {
    return (
      <div className="shell shell--playground">
        {renderHeader(
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
          isStarted={routeProblem ? startedIds.has(routeProblem.id) : false}
          problem={routeProblem}
          onBack={goToLibrary}
          onMarkPracticed={() => {
            if (!routeProblem || practicedIds.has(routeProblem.id)) {
              return;
            }

            actions.togglePracticed(routeProblem.id);
          }}
          onMarkStarted={() => {
            if (!routeProblem || startedIds.has(routeProblem.id)) {
              return;
            }

            actions.setStarted(routeProblem.id, true);
          }}
          onUnmarkStarted={() => {
            if (!routeProblem || !startedIds.has(routeProblem.id)) {
              return;
            }

            actions.setStarted(routeProblem.id, false);
          }}
          onOpenPricing={goToPricing}
          onSaveStatusChange={setPlaygroundSaveStatus}
        />
        {renderOverlays()}
      </div>
    );
  }

  if (route.name === "home") {
    return (
      <div className="shell shell--landing">
        {renderHeader()}

        <LandingPage
          categories={categories}
          featuredProblems={problems.slice(0, 3)}
          metrics={metrics}
          practicedIds={practicedIds}
          onOpenLibrary={goToLibrary}
          onPickRandomProblem={handlePickRandomProblem}
          onSelectProblem={handleSelectProblem}
        />
        {renderOverlays()}
      </div>
    );
  }

  if (route.name === "pricing" && features.billing) {
    return (
      <div className="shell">
        {renderHeader()}

        <PricingPage
          onOpenAccount={goToAccount}
        />
        {renderOverlays()}
      </div>
    );
  }

  if (route.name === "onboarding" && features.onboarding) {
    return (
      <div className="shell">
        {renderHeader()}

        <OnboardingPage
          onOpenLibrary={goToLibrary}
          onOpenPricing={features.billing ? goToPricing : goToLibrary}
        />
        {renderOverlays()}
      </div>
    );
  }

  if (route.name === "account" && features.billing) {
    return (
      <div className="shell">
        {renderHeader()}

        <AccountBillingPage
          onClose={handleCloseAccount}
          onOpenPricing={goToPricing}
        />
        {renderOverlays()}
      </div>
    );
  }

  return (
    <div className="shell">
      {renderHeader()}

      <main className="workspace workspace--library-only">
        <ProblemCatalogPanel
          access={access}
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
          startedIds={startedIds}
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
          onToggleBookmark={actions.toggleBookmark}
        />
      </main>
      {renderOverlays()}
    </div>
  );
}
