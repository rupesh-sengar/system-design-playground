import { useEffect, useMemo, useRef, useState } from "react";
import { useAppAuth } from "@/features/auth/app-auth";
import { getApiErrorDetails } from "@/shared/api/http";
import {
  isRichTextEffectivelyEmpty,
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "@/shared/lib/richText";
import { useToast } from "@/shared/toast/toast-provider";
import {
  useDeletePracticeSessionMutation,
  useGetPracticeSessionQuery,
  useUpsertPracticeSessionMutation,
} from "../api/practiceSessionApi";
import {
  useGenerateStageHintsMutation,
  useValidateStageDraftMutation,
} from "../api/coachApi";
import {
  buildPracticeMetrics,
  buildStageContextCards,
  createPracticeSessionSnapshot,
  createDefaultSession,
  fromPersistedPracticeSession,
  getAdjacentStageId,
  normalizePracticeSession,
  parseStoredSessions,
  toPersistedPracticeSessionInput,
} from "../lib/session";
import { practiceStages } from "../model/stages";
import type {
  PracticePlaygroundViewModel,
  PracticeCoachStageState,
  PracticeCoachStageStateMap,
  PracticeAiRequestError,
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

const toPracticeAiRequestError = (
  error: unknown,
  fallbackMessage: string,
): PracticeAiRequestError => {
  const details = getApiErrorDetails(error, fallbackMessage);

  return {
    kind: details.kind,
    message: details.message,
    occurredAt: new Date().toISOString(),
    retryable: details.retryable,
    statusCode: details.statusCode,
  };
};

export const usePracticePlayground = (
  problem: PracticeProblem | null,
): PracticePlaygroundViewModel => {
  const { isApiAuthReady } = useAppAuth();
  const toast = useToast();
  const [triggerGenerateStageHints] = useGenerateStageHintsMutation();
  const [triggerValidateStageDraft] = useValidateStageDraftMutation();
  const [deletePracticeSession, deletePracticeSessionState] =
    useDeletePracticeSessionMutation();
  const [savePracticeSession, savePracticeSessionState] =
    useUpsertPracticeSessionMutation();
  const [sessions, setSessions] = useState<PracticeSessionStore>(() =>
    parseStoredSessions(window.localStorage.getItem(STORAGE_KEY)),
  );
  const [coachStateByProblemId, setCoachStateByProblemId] =
    useState<PracticeCoachStore>({});
  const [remoteSession, setRemoteSession] = useState<PracticeSession | null>(
    null,
  );
  const [persistedRemoteSnapshot, setPersistedRemoteSnapshot] = useState<
    string | null
  >(null);
  const {
    data: persistedSession,
    error: persistedSessionError,
    isFetching: isPersistedSessionFetching,
    isLoading: isPersistedSessionLoading,
  } = useGetPracticeSessionQuery(problem?.id ?? "", {
    skip: !isApiAuthReady || !problem,
  });
  const lastPersistedSessionErrorRef = useRef<string | null>(null);
  const lastSaveErrorRef = useRef<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const browserSession = useMemo<PracticeSession | null>(() => {
    if (!problem) {
      return null;
    }

    return sessions[problem.id] ?? createDefaultSession();
  }, [problem, sessions]);

  useEffect(() => {
    if (!isApiAuthReady) {
      setRemoteSession(null);
      setPersistedRemoteSnapshot(null);
      return;
    }

    if (!problem) {
      setRemoteSession(null);
      setPersistedRemoteSnapshot(null);
      return;
    }

    setRemoteSession(null);
    setPersistedRemoteSnapshot(null);
  }, [isApiAuthReady, problem?.id]);

  useEffect(() => {
    if (!isApiAuthReady || !problem) {
      return;
    }

    if (isPersistedSessionLoading || isPersistedSessionFetching) {
      return;
    }

    const nextSession = normalizePracticeSession(
      fromPersistedPracticeSession(persistedSession ?? null) ??
        createDefaultSession(),
    );

    setRemoteSession(nextSession);
    setPersistedRemoteSnapshot(createPracticeSessionSnapshot(nextSession));
  }, [
    isApiAuthReady,
    isPersistedSessionFetching,
    isPersistedSessionLoading,
    persistedSession,
    problem,
  ]);

  useEffect(() => {
    if (!isApiAuthReady || !persistedSessionError) {
      lastPersistedSessionErrorRef.current = null;
      return;
    }

    const message = getApiErrorDetails(
      persistedSessionError,
      "Unable to load saved playground notes.",
    ).message;

    if (message === lastPersistedSessionErrorRef.current) {
      return;
    }

    lastPersistedSessionErrorRef.current = message;
    toast.error(message, {
      dedupeKey: "practice-session-load-error",
      title: "Session Load Failed",
    });
  }, [isApiAuthReady, persistedSessionError, toast]);

  const session = useMemo<PracticeSession | null>(() => {
    if (!problem) {
      return null;
    }

    if (isApiAuthReady) {
      return remoteSession;
    }

    return browserSession;
  }, [browserSession, isApiAuthReady, problem, remoteSession]);

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

    if (isApiAuthReady) {
      setRemoteSession((currentSession) =>
        normalizePracticeSession(updater(currentSession ?? createDefaultSession())),
      );
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

  useEffect(() => {
    if (!isApiAuthReady || !problem || !remoteSession || !persistedRemoteSnapshot) {
      return;
    }

    const currentSnapshot = createPracticeSessionSnapshot(remoteSession);

    if (currentSnapshot === persistedRemoteSnapshot) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void savePracticeSession({
        problemId: problem.id,
        session: toPersistedPracticeSessionInput(remoteSession),
      })
        .unwrap()
        .then(() => {
          setPersistedRemoteSnapshot(currentSnapshot);
        })
        .catch(() => undefined);
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isApiAuthReady,
    persistedRemoteSnapshot,
    problem,
    remoteSession,
    savePracticeSession,
  ]);

  useEffect(() => {
    if (!isApiAuthReady || !savePracticeSessionState.error) {
      lastSaveErrorRef.current = null;
      return;
    }

    const message = getApiErrorDetails(
      savePracticeSessionState.error,
      "Unable to save playground notes.",
    ).message;

    if (message === lastSaveErrorRef.current) {
      return;
    }

    lastSaveErrorRef.current = message;
    toast.error(message, {
      dedupeKey: "practice-session-save-error",
      title: "Autosave Failed",
    });
  }, [isApiAuthReady, savePracticeSessionState.error, toast]);

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
      isApiAuthReady
        ? `Clear the saved playground notes for ${problem.title} from your account?`
        : `Clear the saved playground notes for ${problem.title}?`,
    );

    if (!shouldReset) {
      return;
    }

    if (isApiAuthReady) {
      const nextSession = createDefaultSession();
      setRemoteSession(nextSession);
      setPersistedRemoteSnapshot(createPracticeSessionSnapshot(nextSession));
      void deletePracticeSession(problem.id)
        .unwrap()
        .then(() => {
          toast.success("Saved playground notes cleared.", {
            title: "Session Reset",
          });
        })
        .catch((error) => {
          toast.error(
            getApiErrorDetails(
              error,
              "Unable to reset saved playground notes.",
            ).message,
            {
              dedupeKey: "practice-session-reset-error",
              title: "Session Reset Failed",
            },
          );
        });
    } else {
      setSessions((currentSessions) => {
        const nextSessions = { ...currentSessions };
        delete nextSessions[problem.id];
        return nextSessions;
      });
    }

    setCoachStateByProblemId((currentState) => {
      const nextState = { ...currentState };
      delete nextState[problem.id];
      return nextState;
    });
  };

  const storage = useMemo(() => {
    const errorSource =
      savePracticeSessionState.error ??
      deletePracticeSessionState.error ??
      persistedSessionError;

    return {
      errorMessage: errorSource
        ? getApiErrorDetails(
            errorSource,
            "Unable to sync saved playground notes.",
          ).message
        : null,
      isLoading: isApiAuthReady
        ? Boolean(problem) &&
          remoteSession === null &&
          (isPersistedSessionLoading || isPersistedSessionFetching)
        : false,
      isRemote: isApiAuthReady,
      isSaving:
        isApiAuthReady &&
        (savePracticeSessionState.isLoading || deletePracticeSessionState.isLoading),
    };
  }, [
    deletePracticeSessionState.error,
    deletePracticeSessionState.isLoading,
    isApiAuthReady,
    isPersistedSessionFetching,
    isPersistedSessionLoading,
    persistedSessionError,
    problem,
    remoteSession,
    savePracticeSessionState.error,
    savePracticeSessionState.isLoading,
  ]);

  if (!problem) {
    return {
      actions: {
        goToNextStage: () => undefined,
        goToPreviousStage: () => undefined,
        resetSession: () => undefined,
        setActiveStage: () => undefined,
        toggleStageComplete: () => undefined,
        updateActiveStageNotes: () => undefined,
      },
      activeStage: practiceStages[0],
      activeStageDraft: createDefaultSession().stages[practiceStages[0].id],
      assistant: {
        actions: {
          clearActiveStageFeedback: () => undefined,
          reloadHints: async () => undefined,
          reloadValidation: async () => undefined,
          requestHints: async () => undefined,
          retryHints: async () => undefined,
          retryValidation: async () => undefined,
          validateDraft: async () => undefined,
        },
        activeStageState: createEmptyCoachStageState(),
        canRequestHints: false,
        canValidateDraft: false,
        draftWordCount: 0,
        hasAnyFeedback: false,
        isHintStale: false,
        isValidationStale: false,
      },
      metrics: buildPracticeMetrics(createDefaultSession()),
      session: null,
      storage,
      stageContextCards: [],
      stages: practiceStages,
      drafts: null,
    };
  }

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
      const response = await triggerGenerateStageHints({
        currentDraft: sourceDraft,
        problem,
        stageId,
      }).unwrap();

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
      toast.success("Stage hints are ready.", {
        title: "Hints Generated",
      });
    } catch (error) {
      const hintError = toPracticeAiRequestError(
        error,
        "Unable to generate hints right now.",
      );

      updateCoachState(stageId, (current) => ({
        ...current,
        hintError,
        hintStatus: "error",
      }));
      toast.error(hintError.message, {
        dedupeKey: `practice-hints-error-${stageId}`,
        title: "Hint Request Failed",
      });
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
      const response = await triggerValidateStageDraft({
        problem,
        stageId,
        submission: sourceDraft,
      }).unwrap();

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
      toast.success("Structured draft feedback is ready.", {
        title: "Validation Complete",
      });
    } catch (error) {
      const validationError = toPracticeAiRequestError(
        error,
        "Unable to validate this draft right now.",
      );

      updateCoachState(stageId, (current) => ({
        ...current,
        validationError,
        validationStatus: "error",
      }));
      toast.error(validationError.message, {
        dedupeKey: `practice-validation-error-${stageId}`,
        title: "Validation Failed",
      });
    }
  };

  const retryHints = async (): Promise<void> => {
    await requestHints();
  };

  const retryValidation = async (): Promise<void> => {
    await validateDraft();
  };

  const reloadHints = async (): Promise<void> => {
    await requestHints();
  };

  const reloadValidation = async (): Promise<void> => {
    await validateDraft();
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
        reloadHints,
        reloadValidation,
        requestHints,
        retryHints,
        retryValidation,
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
    storage,
    stageContextCards,
    stages: practiceStages,
    drafts: session?.stages ?? null,
  };
};
