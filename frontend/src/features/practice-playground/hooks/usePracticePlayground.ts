import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/shared/api/http";
import {
  isRichTextEffectivelyEmpty,
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "@/shared/lib/richText";
import { generateStageHints, validateStageDraft } from "../api/coach";
import {
  buildPracticeMetrics,
  buildStageContextCards,
  createDefaultSession,
  getAdjacentStageId,
  parseStoredSessions,
} from "../lib/session";
import { practiceStages } from "../model/stages";
import type {
  PracticePlaygroundViewModel,
  PracticeCoachStageState,
  PracticeCoachStageStateMap,
  PracticeProblem,
  PracticeSession,
  PracticeSessionStore,
  PracticeStageId,
} from "../model/types";

const STORAGE_KEY = "system-design-lab.practice-playground";

type PracticeCoachStore = Record<string, PracticeCoachStageStateMap>;

const createEmptyCoachStageState = (): PracticeCoachStageState => ({
  hintError: null,
  hintResult: null,
  hintStatus: "idle",
  validationError: null,
  validationResult: null,
  validationStatus: "idle",
});

const createEmptyCoachStateMap = (): PracticeCoachStageStateMap =>
  practiceStages.reduce<PracticeCoachStageStateMap>((coachState, stage) => {
    coachState[stage.id] = createEmptyCoachStageState();
    return coachState;
  }, {} as PracticeCoachStageStateMap);

const countWords = (value: string): number =>
  value.split(/\s+/).filter(Boolean).length;

export const usePracticePlayground = (
  problem: PracticeProblem | null,
): PracticePlaygroundViewModel => {
  const [sessions, setSessions] = useState<PracticeSessionStore>(() =>
    parseStoredSessions(window.localStorage.getItem(STORAGE_KEY)),
  );
  const [coachStateByProblemId, setCoachStateByProblemId] =
    useState<PracticeCoachStore>({});

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const session = useMemo<PracticeSession | null>(() => {
    if (!problem) {
      return null;
    }

    return sessions[problem.id] ?? createDefaultSession();
  }, [problem, sessions]);

  const activeStage = useMemo(() => {
    if (!session) {
      return practiceStages[0];
    }

    return (
      practiceStages.find((stage) => stage.id === session.activeStageId) ??
      practiceStages[0]
    );
  }, [session]);

  const activeStageDraft = useMemo(() => {
    if (!session) {
      return createDefaultSession().stages[practiceStages[0].id];
    }

    return session.stages[activeStage.id];
  }, [activeStage.id, session]);

  const metrics = useMemo(
    () =>
      session
        ? buildPracticeMetrics(session)
        : buildPracticeMetrics(createDefaultSession()),
    [session],
  );

  const stageContextCards = useMemo(() => {
    if (!problem) {
      return [];
    }

    return buildStageContextCards(problem, activeStage.id);
  }, [activeStage.id, problem]);

  const coachState = useMemo<PracticeCoachStageStateMap>(() => {
    if (!problem) {
      return createEmptyCoachStateMap();
    }

    return coachStateByProblemId[problem.id] ?? createEmptyCoachStateMap();
  }, [coachStateByProblemId, problem]);

  const activeStageState = useMemo(
    () => coachState[activeStage.id],
    [activeStage.id, coachState],
  );

  const activeStagePlainText = useMemo(
    () => richTextToPlainText(activeStageDraft.notes),
    [activeStageDraft.notes],
  );
  const draftWordCount = useMemo(
    () => countWords(activeStagePlainText),
    [activeStagePlainText],
  );

  const updateSession = (
    updater: (current: PracticeSession) => PracticeSession,
  ): void => {
    if (!problem) {
      return;
    }

    setSessions((currentSessions) => {
      const currentSession =
        currentSessions[problem.id] ?? createDefaultSession();
      const nextSession = updater(currentSession);

      return {
        ...currentSessions,
        [problem.id]: nextSession,
      };
    });
  };

  const updateCoachState = (
    stageId: PracticeStageId,
    updater: (current: PracticeCoachStageState) => PracticeCoachStageState,
  ): void => {
    if (!problem) {
      return;
    }

    setCoachStateByProblemId((currentState) => {
      const currentProblemState =
        currentState[problem.id] ?? createEmptyCoachStateMap();

      return {
        ...currentState,
        [problem.id]: {
          ...currentProblemState,
          [stageId]: updater(currentProblemState[stageId]),
        },
      };
    });
  };

  const setActiveStage = (stageId: PracticeStageId): void => {
    updateSession((current) => ({
      ...current,
      activeStageId: stageId,
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateActiveStageNotes = (notes: string): void => {
    updateSession((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      stages: {
        ...current.stages,
        [current.activeStageId]: {
          ...current.stages[current.activeStageId],
          notes: sanitizeRichTextHtml(notes),
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  };

  const toggleStageComplete = (stageId: PracticeStageId): void => {
    updateSession((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      stages: {
        ...current.stages,
        [stageId]: {
          ...current.stages[stageId],
          isComplete: !current.stages[stageId].isComplete,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  };

  const goToNextStage = (): void => {
    if (!session) {
      return;
    }

    setActiveStage(getAdjacentStageId(session.activeStageId, "next"));
  };

  const goToPreviousStage = (): void => {
    if (!session) {
      return;
    }

    setActiveStage(getAdjacentStageId(session.activeStageId, "previous"));
  };

  const resetSession = (): void => {
    if (!problem) {
      return;
    }

    const shouldReset = window.confirm(
      `Clear the saved playground notes for ${problem.title}?`,
    );

    if (!shouldReset) {
      return;
    }

    setSessions((currentSessions) => {
      const nextSessions = { ...currentSessions };
      delete nextSessions[problem.id];
      return nextSessions;
    });

    setCoachStateByProblemId((currentState) => {
      const nextState = { ...currentState };
      delete nextState[problem.id];
      return nextState;
    });
  };

  const requestHints = async (): Promise<void> => {
    if (!problem || isRichTextEffectivelyEmpty(activeStageDraft.notes)) {
      return;
    }

    const stageId = activeStage.id;
    const sourceDraft = richTextToPlainText(activeStageDraft.notes);

    updateCoachState(stageId, (current) => ({
      ...current,
      hintError: null,
      hintStatus: "loading",
    }));

    try {
      const response = await generateStageHints({
        currentDraft: sourceDraft,
        problem,
        stageId,
      });

      updateCoachState(stageId, (current) => ({
        ...current,
        hintError: null,
        hintResult: {
          ...response.data,
          meta: response.meta,
          receivedAt: new Date().toISOString(),
          sourceDraft,
        },
        hintStatus: "success",
      }));
    } catch (error) {
      updateCoachState(stageId, (current) => ({
        ...current,
        hintError: getApiErrorMessage(
          error,
          "Unable to generate hints right now.",
        ),
        hintStatus: "error",
      }));
    }
  };

  const validateDraft = async (): Promise<void> => {
    if (!problem || activeStagePlainText.length < 20) {
      return;
    }

    const stageId = activeStage.id;
    const sourceDraft = activeStagePlainText;

    updateCoachState(stageId, (current) => ({
      ...current,
      validationError: null,
      validationStatus: "loading",
    }));

    try {
      const response = await validateStageDraft({
        problem,
        stageId,
        submission: sourceDraft,
      });

      updateCoachState(stageId, (current) => ({
        ...current,
        validationError: null,
        validationResult: {
          ...response.data,
          meta: response.meta,
          receivedAt: new Date().toISOString(),
          sourceDraft,
        },
        validationStatus: "success",
      }));
    } catch (error) {
      updateCoachState(stageId, (current) => ({
        ...current,
        validationError: getApiErrorMessage(
          error,
          "Unable to validate this draft right now.",
        ),
        validationStatus: "error",
      }));
    }
  };

  const clearActiveStageFeedback = (): void => {
    updateCoachState(activeStage.id, () => createEmptyCoachStageState());
  };

  const hasAnyFeedback =
    activeStageState.hintResult !== null ||
    activeStageState.validationResult !== null;
  const isHintStale =
    activeStageState.hintResult?.sourceDraft !== undefined &&
    activeStageState.hintResult.sourceDraft !== activeStagePlainText;
  const isValidationStale =
    activeStageState.validationResult?.sourceDraft !== undefined &&
    activeStageState.validationResult.sourceDraft !== activeStagePlainText;

  return {
    actions: {
      goToNextStage,
      goToPreviousStage,
      resetSession,
      setActiveStage,
      toggleStageComplete,
      updateActiveStageNotes,
    },
    activeStage,
    activeStageDraft,
    assistant: {
      actions: {
        clearActiveStageFeedback,
        requestHints,
        validateDraft,
      },
      activeStageState,
      canRequestHints:
        !isRichTextEffectivelyEmpty(activeStageDraft.notes) &&
        activeStageState.hintStatus !== "loading",
      canValidateDraft:
        activeStagePlainText.length >= 20 &&
        activeStageState.validationStatus !== "loading",
      draftWordCount,
      hasAnyFeedback,
      isHintStale,
      isValidationStale,
    },
    metrics,
    session,
    stageContextCards,
    stages: practiceStages,
    drafts: session?.stages ?? null,
  };
};
