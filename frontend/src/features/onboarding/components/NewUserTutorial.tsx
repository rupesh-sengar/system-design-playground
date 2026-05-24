import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  ListChecks,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import "./new-user-tutorial.css";

export type TutorialRouteTarget = "home" | "library" | "playground";

interface NewUserTutorialProps {
  currentRoute: TutorialRouteTarget;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: TutorialRouteTarget) => void;
}

interface TutorialStep {
  actionLabel: string;
  description: string;
  icon: typeof BookOpenCheck;
  id: string;
  kicker: string;
  points: string[];
  route: TutorialRouteTarget;
  target: string;
  title: string;
}

interface TutorialRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "home",
    route: "home",
    target: "home-overview",
    kicker: "Home",
    title: "Start from the practice workspace",
    description:
      "The home screen gives new users a fast path into structured system design practice without needing to configure anything first.",
    points: [
      "Browse the full problem library when you want control.",
      "Use Random Drill when you want a quick interview-style prompt.",
      "Track practiced progress as sessions are completed.",
    ],
    actionLabel: "Show home",
    icon: LayoutDashboard,
  },
  {
    id: "library-filters",
    route: "library",
    target: "library-filters",
    kicker: "Library",
    title: "Narrow the catalog before choosing a prompt",
    description:
      "Filters keep the library usable as the problem set grows. Users can combine search, category, difficulty, status, and sort order.",
    points: [
      "Search by system name, topic, or keyword.",
      "Filter by difficulty and completion status.",
      "Clear filters to return to the full catalog.",
    ],
    actionLabel: "Show filters",
    icon: Search,
  },
  {
    id: "library-problems",
    route: "library",
    target: "library-problems",
    kicker: "Problem cards",
    title: "Pick a prompt with enough context",
    description:
      "Problem cards summarize the scenario, difficulty, domain, and saved or practiced state so users can choose the right drill.",
    points: [
      "Select any card to open a focused practice round.",
      "Use Saved and Done chips to resume familiar work.",
      "Pagination keeps long catalogs scannable.",
    ],
    actionLabel: "Show problems",
    icon: BookOpenCheck,
  },
  {
    id: "playground-brief",
    route: "playground",
    target: "playground-overview",
    kicker: "Playground",
    title: "Use the sidebar as the interview brief",
    description:
      "The sidebar keeps the current prompt, objective, deliverable, and progress visible while the user drafts an answer.",
    points: [
      "Overview shows the active stage and expected output.",
      "Guides surface prompts, review checks, and problem anchors.",
      "AI is available for hints and validation when sign-in is ready.",
    ],
    actionLabel: "Show playground",
    icon: Target,
  },
  {
    id: "playground-stages",
    route: "playground",
    target: "playground-stages",
    kicker: "Answer flow",
    title: "Move through a complete system design structure",
    description:
      "The stage strip breaks a broad interview prompt into a repeatable sequence, helping users avoid jumping straight to architecture.",
    points: [
      "Requirements, entities, APIs, data flow, architecture, and deep dives stay separate.",
      "Completed stages are reflected in progress metrics.",
      "Previous and Next keep the round moving without losing context.",
    ],
    actionLabel: "Show stages",
    icon: ListChecks,
  },
  {
    id: "playground-workspace",
    route: "playground",
    target: "playground-workspace",
    kicker: "Workspace",
    title: "Draft notes and diagrams in the same round",
    description:
      "Each stage has its own saved workspace. The high-level design stage also offers a drawpad for diagrams alongside rich notes.",
    points: [
      "Write stage-specific notes instead of one long scratchpad.",
      "Switch to the drawpad when architecture needs a visual model.",
      "Local or account-backed saving keeps the session recoverable.",
    ],
    actionLabel: "Show workspace",
    icon: FileText,
  },
  {
    id: "playground-actions",
    route: "playground",
    target: "playground-actions",
    kicker: "Review",
    title: "Get feedback and finish with visible progress",
    description:
      "Hints and validation help users iterate, while completion controls make practice progress explicit across the app.",
    points: [
      "Get hints when a stage needs a push.",
      "Validate the draft to reveal gaps before moving on.",
      "Mark stages complete, then mark the full problem practiced.",
    ],
    actionLabel: "Show actions",
    icon: Sparkles,
  },
];

const getStartingStep = (route: TutorialRouteTarget): number => {
  if (route === "playground") {
    return 3;
  }

  if (route === "library") {
    return 1;
  }

  return 0;
};

export const NewUserTutorial = ({
  currentRoute,
  isOpen,
  onClose,
  onNavigate,
}: NewUserTutorialProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TutorialRect | null>(null);
  const [panelPlacement, setPanelPlacement] = useState<"top" | "bottom">(
    "bottom",
  );
  const wasOpenRef = useRef(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const activeStep = tutorialSteps[activeIndex];
  const activeStepNumber = activeIndex + 1;
  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === tutorialSteps.length - 1;
  const ActiveIcon = activeStep.icon;

  const updateTargetRect = useCallback((): void => {
    const target = document.querySelector<HTMLElement>(
      `[data-tour-target="${activeStep.target}"]`,
    );

    if (!target) {
      setTargetRect(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = 8;
    const left = Math.max(8, rect.left - padding);
    const top = Math.max(8, rect.top - padding);
    const right = Math.min(window.innerWidth - 8, rect.right + padding);
    const bottom = Math.min(window.innerHeight - 8, rect.bottom + padding);

    setTargetRect({
      height: Math.max(0, bottom - top),
      left,
      top,
      width: Math.max(0, right - left),
    });
    setPanelPlacement(
      rect.top + rect.height / 2 > window.innerHeight * 0.54
        ? "top"
        : "bottom",
    );
  }, [activeStep.target]);

  const goToStep = useCallback(
    (nextIndex: number): void => {
      const boundedIndex = Math.min(
        tutorialSteps.length - 1,
        Math.max(0, nextIndex),
      );

      setActiveIndex(boundedIndex);
      onNavigate(tutorialSteps[boundedIndex].route);
    },
    [onNavigate],
  );

  const showCurrentTarget = (): void => {
    onNavigate(activeStep.route);

    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-tour-target="${activeStep.target}"]`,
      );

      target?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
      updateTargetRect();
    }, 120);
  };

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const startingIndex = getStartingStep(currentRoute);
      setActiveIndex(startingIndex);
      onNavigate(tutorialSteps[startingIndex].route);

      window.setTimeout(() => {
        panelRef.current?.focus();
      }, 0);
    }

    wasOpenRef.current = isOpen;
  }, [currentRoute, isOpen, onNavigate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const target = document.querySelector<HTMLElement>(
      `[data-tour-target="${activeStep.target}"]`,
    );

    target?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    const animationFrame = window.requestAnimationFrame(updateTargetRect);
    const timers = [120, 320, 720].map((delay) =>
      window.setTimeout(updateTargetRect, delay),
    );

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [activeStep.target, isOpen, updateTargetRect]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && !isFirstStep) {
        event.preventDefault();
        goToStep(activeIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();

        if (isLastStep) {
          onClose();
        } else {
          goToStep(activeIndex + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, goToStep, isFirstStep, isLastStep, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const spotlightStyle: CSSProperties | undefined = targetRect
    ? {
        height: targetRect.height,
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
      }
    : undefined;

  return (
    <div className="tutorial-tour">
      {targetRect ? (
        <div
          aria-hidden="true"
          className="tutorial-tour__spotlight"
          style={spotlightStyle}
        />
      ) : (
        <div aria-hidden="true" className="tutorial-tour__backdrop" />
      )}

      <aside
        ref={panelRef}
        aria-labelledby="tutorial-tour-title"
        aria-modal="true"
        className={`tutorial-tour__panel tutorial-tour__panel--${panelPlacement}`}
        role="dialog"
        tabIndex={-1}
      >
        <div className="tutorial-tour__rail" aria-label="Tutorial steps">
          {tutorialSteps.map((step, index) => (
            <button
              key={step.id}
              aria-current={index === activeIndex ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${step.title}`}
              className={`tutorial-tour__step ${
                index === activeIndex ? "tutorial-tour__step--active" : ""
              }`}
              type="button"
              onClick={() => goToStep(index)}
            >
              <span className="tutorial-tour__step-number">{index + 1}</span>
              <span>{step.kicker}</span>
            </button>
          ))}
        </div>

        <div className="tutorial-tour__content">
          <div className="tutorial-tour__topline">
            <span className="tutorial-tour__icon">
              <ActiveIcon aria-hidden="true" size={18} strokeWidth={2} />
            </span>
            <span className="tutorial-tour__count">
              {activeStepNumber} / {tutorialSteps.length}
            </span>
            <button
              aria-label="Close tutorial"
              className="tutorial-tour__close"
              type="button"
              onClick={onClose}
            >
              <X aria-hidden="true" size={17} strokeWidth={2} />
            </button>
          </div>

          <div className="tutorial-tour__copy">
            <p className="section-label">{activeStep.kicker}</p>
            <h2 id="tutorial-tour-title">{activeStep.title}</h2>
            <p>{activeStep.description}</p>
          </div>

          <ul className="tutorial-tour__points">
            {activeStep.points.map((point) => (
              <li key={point}>
                <CheckCircle2 aria-hidden="true" size={15} strokeWidth={2} />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="tutorial-tour__progress" aria-hidden="true">
            {tutorialSteps.map((step, index) => (
              <span
                key={step.id}
                className={
                  index <= activeIndex ? "tutorial-tour__dot--active" : ""
                }
              />
            ))}
          </div>

          <div className="tutorial-tour__actions">
            <button
              className="secondary-action tutorial-tour__target-action"
              type="button"
              onClick={showCurrentTarget}
            >
              {activeStep.actionLabel}
            </button>

            <div className="tutorial-tour__nav">
              <button
                aria-label="Previous tutorial step"
                className="secondary-action tutorial-tour__nav-button"
                disabled={isFirstStep}
                type="button"
                onClick={() => goToStep(activeIndex - 1)}
              >
                <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
                Back
              </button>
              <button
                className="primary-action tutorial-tour__nav-button"
                type="button"
                onClick={() => {
                  if (isLastStep) {
                    onClose();
                    return;
                  }

                  goToStep(activeIndex + 1);
                }}
              >
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep ? (
                  <ChevronRight
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                  />
                ) : null}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
