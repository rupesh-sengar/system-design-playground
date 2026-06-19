import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Database,
  GitBranch,
  Layers,
  Network,
  Route,
  Search,
  ShieldCheck,
  Shuffle,
  Target,
  Timer,
} from "lucide-react";
import type { Problem } from "@/features/problem-library/model/problem-library";
import type { ProblemLibraryMetrics } from "@/features/problem-library/model/types";
import "@/shared/ui/shared-ui.css";
import "./LandingPage.css";

interface LandingPageProps {
  categories: string[];
  featuredProblems: Problem[];
  metrics: ProblemLibraryMetrics;
  practicedIds: Set<string>;
  onOpenLibrary: () => void;
  onPickRandomProblem: () => void;
  onSelectProblem: (problemId: string) => void;
}

const practiceFlow = [
  {
    icon: Target,
    label: "Scope",
    copy: "Clarify requirements, users, constraints, and success metrics.",
  },
  {
    icon: Route,
    label: "Model",
    copy: "Map APIs, data, core services, and storage boundaries.",
  },
  {
    icon: GitBranch,
    label: "Scale",
    copy: "Pressure-test bottlenecks, failures, tradeoffs, and observability.",
  },
];

export const LandingPage = ({
  categories,
  featuredProblems,
  metrics,
  practicedIds,
  onOpenLibrary,
  onPickRandomProblem,
  onSelectProblem,
}: LandingPageProps) => {
  const completionPercent =
    metrics.totalProblems === 0
      ? 0
      : Math.round((metrics.practicedCount / metrics.totalProblems) * 100);
  const visibleCategories = categories
    .filter((category) => category !== "All")
    .slice(0, 6);
  const domainCount = categories.filter(
    (category) => category !== "All",
  ).length;

  return (
    <main className="landing-page">
      <section
        className="landing-hero"
        aria-labelledby="landing-title"
        data-tour-target="home-overview"
      >
        <div className="landing-hero__inner">
          <div className="landing-hero__content">
            <p className="eyebrow">Interview practice workspace</p>
            <h1 id="landing-title">System Design Lab</h1>
            <p className="landing-hero__copy">
              Work through curated system design prompts, structure your answer
              in a focused playground, and keep progress visible as you
              practice.
            </p>

            <div
              className="landing-hero__actions"
              data-tour-target="home-actions"
            >
              <button
                className="primary-action landing-action"
                type="button"
                onClick={onOpenLibrary}
              >
                <BookOpenCheck aria-hidden="true" size={16} strokeWidth={2} />
                Browse Problems
                <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
              </button>
              <button
                className="secondary-action landing-action"
                type="button"
                onClick={onPickRandomProblem}
              >
                <Shuffle aria-hidden="true" size={16} strokeWidth={2} />
                Random Drill
              </button>
            </div>

            <div className="landing-hero__progress">
              <span>{completionPercent}% practiced</span>
              <div
                aria-label={`${completionPercent}% of problems practiced`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={completionPercent}
                className="landing-progress-meter"
                role="meter"
              >
                <span style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="landing-hero__scene" aria-hidden="true">
            <div className="landing-map">
              <svg
                className="landing-map__connectors"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path d="M25 31 C32 31 34 37 37 39" />
                <path d="M40 22 C45 27 44 32 43 34" />
                <path d="M31 58 C35 55 38 50 39 46" />
                <path d="M52 36 C59 32 62 26 64 23" />
                <path d="M52 41 C63 41 70 44 78 46" />
                <path d="M49 47 C55 54 59 60 62 64" />
                <path d="M61 73 C54 78 48 82 44 82" />
                <path d="M71 71 C75 74 78 78 79 80" />
              </svg>

              <div className="landing-map__node landing-map__node--client">
                <Network size={16} strokeWidth={1.9} />
                Client
              </div>
              <div
                className="landing-map__node landing-map__node--compact landing-map__node--cdn"
              >
                <Cloud size={14} strokeWidth={1.9} />
                CDN
              </div>
              <div
                className="landing-map__node landing-map__node--compact landing-map__node--auth"
              >
                <ShieldCheck size={14} strokeWidth={1.9} />
                Auth
              </div>
              <div className="landing-map__node landing-map__node--gateway">
                <Route size={16} strokeWidth={1.9} />
                Gateway
              </div>
              <div className="landing-map__node landing-map__node--cache">
                <Timer size={16} strokeWidth={1.9} />
                Cache
              </div>
              <div className="landing-map__node landing-map__node--queue">
                <GitBranch size={16} strokeWidth={1.9} />
                Queue
              </div>
              <div className="landing-map__node landing-map__node--worker">
                <Layers size={16} strokeWidth={1.9} />
                Workers
              </div>
              <div className="landing-map__node landing-map__node--store">
                <Database size={16} strokeWidth={1.9} />
                Storage
              </div>
              <div
                className="landing-map__node landing-map__node--compact landing-map__node--search"
              >
                <Search size={14} strokeWidth={1.9} />
                Search
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*<div className="landing-content">
        <section className="landing-stats" aria-label="Practice summary">
          <article className="landing-stat">
            <span>{metrics.totalProblems}</span>
            <strong>Problems</strong>
          </article>
          <article className="landing-stat">
            <span>{domainCount}</span>
            <strong>Domains</strong>
          </article>
          <article className="landing-stat">
            <span>{metrics.practicedCount}</span>
            <strong>Practiced</strong>
          </article>
          <article className="landing-stat">
            <span>{metrics.totalDifficultyCounts.Hard}</span>
            <strong>Advanced</strong>
          </article>
        </section>

        <section className="landing-section landing-section--split">
          <div className="landing-section__copy">
            <p className="section-label">Practice flow</p>
            <h2>Move from prompt to tradeoffs without losing the thread.</h2>
          </div>

          <div className="landing-flow">
            {practiceFlow.map((step) => {
              const Icon = step.icon;

              return (
                <article key={step.label} className="landing-flow__item">
                  <span className="landing-flow__icon">
                    <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
                  </span>
                  <h3>{step.label}</h3>
                  <p>{step.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section__head">
            <div>
              <p className="section-label">Library coverage</p>
              <h2>Practice across the systems interview surface.</h2>
            </div>
            <button
              className="secondary-action landing-section__action"
              type="button"
              onClick={onOpenLibrary}
            >
              Open Library
              <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="landing-category-grid">
            {visibleCategories.map((category) => (
              <span key={category} className="landing-category">
                {category}
              </span>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section__head">
            <div>
              <p className="section-label">Start point</p>
              <h2>Jump into a representative prompt.</h2>
            </div>
          </div>

          <div className="landing-problem-grid">
            {featuredProblems.map((problem) => (
              <button
                key={problem.id}
                className="landing-problem"
                type="button"
                onClick={() => onSelectProblem(problem.id)}
              >
                <span className="landing-problem__meta">
                  {problem.difficulty} / {problem.category}
                </span>
                <h3>{problem.title}</h3>
                <p>{problem.summary}</p>
                <span className="landing-problem__footer">
                  {practicedIds.has(problem.id) ? (
                    <>
                      <CheckCircle2
                        aria-hidden="true"
                        size={15}
                        strokeWidth={2}
                      />
                      Practiced
                    </>
                  ) : (
                    <>
                      Start
                      <ChevronRight
                        aria-hidden="true"
                        size={15}
                        strokeWidth={2}
                      />
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>*/}
    </main>
  );
};
