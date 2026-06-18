import { practiceStages } from "../model/stages";
import {
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "@/shared/lib/richText";
import {
  normalizeSystemDesignDiagram,
  summarizeSystemDesignDiagram,
  type SystemDesignDiagram,
} from "../model/systemDesignDiagram";
import type {
  PracticeMetrics,
  PracticeProblem,
  PracticeSession,
  PracticeSessionStore,
  PracticeStageHintResult,
  PracticeStageDraftMap,
  PracticeStageId,
  PracticeStageValidationResult,
  StageContextCard,
} from "../model/types";

export interface PersistedPracticeStageDraft {
  diagramJson: SystemDesignDiagram | null;
  hintResult: PracticeStageHintResult | null;
  isComplete: boolean;
  notesHtml: string;
  updatedAt: string | null;
  validationResult: PracticeStageValidationResult | null;
}

export type PersistedPracticeStageDraftMap = Record<
  PracticeStageId,
  PersistedPracticeStageDraft
>;

export interface PersistedPracticeSession {
  activeStageId: PracticeStageId;
  problemId: string;
  stages: PersistedPracticeStageDraftMap;
  updatedAt: string;
}

export interface PersistedPracticeSessionInput {
  activeStageId: PracticeStageId;
  stages: PersistedPracticeStageDraftMap;
}

const countWords = (value: string): number =>
  richTextToPlainText(value).trim().split(/\s+/).filter(Boolean).length;

export const createEmptyDrafts = (): PracticeStageDraftMap =>
  practiceStages.reduce<PracticeStageDraftMap>((drafts, stage) => {
    drafts[stage.id] = {
      diagram: null,
      hintResult: null,
      isComplete: false,
      notes: "",
      updatedAt: null,
      validationResult: null,
    };
    return drafts;
  }, {} as PracticeStageDraftMap);

export const createDefaultSession = (): PracticeSession => ({
  activeStageId: practiceStages[0].id,
  stages: createEmptyDrafts(),
  updatedAt: null,
});

export const normalizePracticeSession = (
  session: PracticeSession,
): PracticeSession => {
  const defaultDrafts = createEmptyDrafts();
  const normalizedStages = practiceStages.reduce<PracticeStageDraftMap>(
    (drafts, stage) => {
      const draft = session.stages?.[stage.id] ?? defaultDrafts[stage.id];
      const notes = typeof draft.notes === "string" ? draft.notes : "";
      const updatedAt =
        typeof draft.updatedAt === "string" ? draft.updatedAt : null;

      drafts[stage.id] = {
        diagram: normalizeSystemDesignDiagram(draft.diagram),
        hintResult: draft.hintResult ?? null,
        isComplete: Boolean(draft.isComplete),
        notes: sanitizeRichTextHtml(notes),
        updatedAt,
        validationResult: draft.validationResult ?? null,
      };

      return drafts;
    },
    {} as PracticeStageDraftMap,
  );

  return {
    activeStageId:
      practiceStages.find((stage) => stage.id === session.activeStageId)?.id ??
      practiceStages[0].id,
    stages: normalizedStages,
    updatedAt: session.updatedAt,
  };
};

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
        normalizePracticeSession(session),
      ]),
    );
  } catch {
    return {};
  }
};

export const toPersistedPracticeSessionInput = (
  session: PracticeSession,
): PersistedPracticeSessionInput => ({
  activeStageId: session.activeStageId,
  stages: Object.fromEntries(
    Object.entries(session.stages).map(([stageId, draft]) => [
      stageId,
      {
        diagramJson: draft.diagram,
        hintResult: draft.hintResult,
        isComplete: draft.isComplete,
        notesHtml: sanitizeRichTextHtml(draft.notes),
        updatedAt: draft.updatedAt,
        validationResult: draft.validationResult,
      },
    ]),
  ) as PersistedPracticeStageDraftMap,
});

export const fromPersistedPracticeSession = (
  session: PersistedPracticeSession | null,
): PracticeSession | null => {
  if (!session) {
    return null;
  }

  return normalizePracticeSession({
    activeStageId: session.activeStageId,
    stages: Object.fromEntries(
      Object.entries(session.stages).map(([stageId, draft]) => [
        stageId,
        {
          diagram: normalizeSystemDesignDiagram(draft.diagramJson),
          hintResult: draft.hintResult ?? null,
          isComplete: draft.isComplete,
          notes: draft.notesHtml,
          updatedAt: draft.updatedAt,
          validationResult: draft.validationResult ?? null,
        },
      ]),
    ) as PracticeStageDraftMap,
    updatedAt: session.updatedAt,
  });
};

export const createPracticeSessionSnapshot = (
  session: PracticeSession,
): string =>
  JSON.stringify({
    activeStageId: session.activeStageId,
    stages: Object.fromEntries(
      practiceStages.map((stage) => [
        stage.id,
        {
          isComplete: session.stages[stage.id].isComplete,
          diagram: normalizeSystemDesignDiagram(session.stages[stage.id].diagram),
          hintResult: session.stages[stage.id].hintResult,
          notes: sanitizeRichTextHtml(session.stages[stage.id].notes),
          validationResult: session.stages[stage.id].validationResult,
        },
      ]),
    ),
  });

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
    (count, stage) =>
      count +
      countWords(session.stages[stage.id].notes) +
      countWords(summarizeSystemDesignDiagram(session.stages[stage.id].diagram)),
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
        items: [...problem.pitfalls.slice(0, 2)],
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
        items: [...problem.focusAreas.slice(0, 3)],
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
  const commonCards: StageContextCard[] = [
    {
      label: "Problem briefing",
      items: [`Category: ${problem.category}`, problem.summary],
    },
    {
      label: "Scale target",
      items: [problem.scale],
    },
  ];

  return [...commonCards, ...getStageSpecificContext(problem, stageId)];
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
