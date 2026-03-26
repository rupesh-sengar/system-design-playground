import { practiceStages } from "../model/stages";
import {
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "@/shared/lib/richText";
import type {
  PracticeMetrics,
  PracticeProblem,
  PracticeSession,
  PracticeSessionStore,
  PracticeStageDraftMap,
  PracticeStageId,
  StageContextCard,
} from "../model/types";

const countWords = (value: string): number =>
  richTextToPlainText(value).trim().split(/\s+/).filter(Boolean).length;

export const createEmptyDrafts = (): PracticeStageDraftMap =>
  practiceStages.reduce<PracticeStageDraftMap>((drafts, stage) => {
    drafts[stage.id] = {
      notes: "",
      isComplete: false,
      updatedAt: null,
    };
    return drafts;
  }, {} as PracticeStageDraftMap);

export const createDefaultSession = (): PracticeSession => ({
  activeStageId: practiceStages[0].id,
  stages: createEmptyDrafts(),
  updatedAt: null,
});

export const parseStoredSessions = (
  rawValue: string | null,
): PracticeSessionStore => {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as PracticeSessionStore;

    if (!parsed) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([problemId, session]) => [
        problemId,
        {
          ...session,
          stages: Object.fromEntries(
            Object.entries(session.stages).map(([stageId, draft]) => [
              stageId,
              {
                ...draft,
                notes: sanitizeRichTextHtml(draft.notes),
              },
            ]),
          ) as PracticeStageDraftMap,
        },
      ]),
    );
  } catch {
    return {};
  }
};

export const getReadinessLabel = (
  completionPercent: number,
  notesWordCount: number,
): string => {
  if (completionPercent === 100 && notesWordCount >= 250) {
    return "Round ready";
  }

  if (completionPercent >= 66 && notesWordCount >= 150) {
    return "Architecture taking shape";
  }

  if (completionPercent >= 33 && notesWordCount >= 80) {
    return "Good foundation";
  }

  return "Needs another pass";
};

export const buildPracticeMetrics = (
  session: PracticeSession,
): PracticeMetrics => {
  const completedCount = practiceStages.filter(
    (stage) => session.stages[stage.id].isComplete,
  ).length;
  const totalCount = practiceStages.length;
  const notesWordCount = practiceStages.reduce(
    (count, stage) => count + countWords(session.stages[stage.id].notes),
    0,
  );
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  return {
    completedCount,
    totalCount,
    completionPercent,
    notesWordCount,
    readinessLabel: getReadinessLabel(completionPercent, notesWordCount),
  };
};

const getStageSpecificContext = (
  problem: PracticeProblem,
  stageId: PracticeStageId,
): StageContextCard[] => {
  if (stageId === "requirements") {
    return [
      {
        label: "Scope anchors",
        items: [problem.summary, problem.scale],
      },
      {
        label: "Clarify early",
        items: [
          "What is the single most important user action?",
          "Which reliability and latency targets are non-negotiable?",
          `What should stay out of scope for ${problem.title} in a 45-minute interview?`,
        ],
      },
    ];
  }

  if (stageId === "core-entities") {
    return [
      {
        label: "Entity hints",
        items: problem.focusAreas.slice(0, 4),
      },
      {
        label: "Modeling prompts",
        items: [
          `List the primary resources in ${problem.title}.`,
          "Call out keys, ownership, and the heaviest relationships.",
        ],
      },
    ];
  }

  if (stageId === "api-interface") {
    return [
      {
        label: "Contract hints",
        items: problem.focusAreas.slice(0, 3),
      },
      {
        label: "Interface pressure points",
        items: [
          "Which requests need idempotency or pagination?",
          "Which writes should be synchronous versus event-driven?",
        ],
      },
    ];
  }

  if (stageId === "data-flow") {
    return [
      {
        label: "Flow pressure points",
        items: [problem.scale, ...problem.pitfalls.slice(0, 2)],
      },
      {
        label: "Trace these paths",
        items: [
          "Hot write path from client to durable storage",
          "Hot read path for a high-traffic user or object",
        ],
      },
    ];
  }

  if (stageId === "high-level-design") {
    return [
      {
        label: "Architecture drivers",
        items: [problem.scale, ...problem.focusAreas.slice(0, 3)],
      },
      {
        label: "Decision lens",
        items: [
          "Which components are mandatory versus optional optimizations?",
          "How does the design satisfy the dominant non-functional requirements?",
        ],
      },
    ];
  }

  return [
    {
      label: "Deep-dive targets",
      items: problem.pitfalls.slice(0, 3),
    },
    {
      label: "Strong follow-ups",
      items: problem.interviewVariants.slice(0, 3),
    },
  ];
};

export const buildStageContextCards = (
  problem: PracticeProblem,
  stageId: PracticeStageId,
): StageContextCard[] => {
  const commonCard: StageContextCard = {
    label: "Problem briefing",
    items: [`Category: ${problem.category}`, problem.summary],
  };

  return [commonCard, ...getStageSpecificContext(problem, stageId)];
};

export const getAdjacentStageId = (
  currentStageId: PracticeStageId,
  direction: "previous" | "next",
): PracticeStageId => {
  const currentIndex = practiceStages.findIndex(
    (stage) => stage.id === currentStageId,
  );
  const nextIndex =
    direction === "next"
      ? Math.min(currentIndex + 1, practiceStages.length - 1)
      : Math.max(currentIndex - 1, 0);

  return practiceStages[nextIndex].id;
};
