import { useEffect, useMemo, useRef, useState } from "react";
import { frontendConfig } from "@/config/env";
import { useAppAuth } from "@/features/auth/app-auth";
import { useGetBillingAccountQuery } from "@/features/billing/api/billingApi";
import { getApiErrorDetails } from "@/shared/api/http";
import {
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "@/shared/lib/richText";
import { useToast } from "@/shared/toast/toast-provider";
import {
  useDeletePracticeSessionMutation,
  useGetPracticeSessionQuery,
  useUpsertPracticeSessionMutation,
} from "../api/practiceSessionApi";
import { useGetStageEditorialQuery } from "../api/stageEditorialApi";
import {
  useGenerateStageHintsMutation,
  useReviewFullDesignMutation,
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
  toPersistedPracticeSessionInput,
} from "../lib/session";
import {
  loadBrowserPracticeSessions,
  saveBrowserPracticeSessions,
} from "../lib/browserPracticeSessionStore";
import { practiceStages } from "../model/stages";
import {
  normalizeSystemDesignDiagram,
  summarizeSystemDesignDiagram,
  type SystemDesignDiagram,
} from "../model/systemDesignDiagram";
import type {
  PracticePlaygroundViewModel,
  PracticeCoachStageState,
  PracticeCoachStageStateMap,
  PracticeAiRequestError,
  PracticeFullDesignReviewResult,
  PracticeProblem,
  PracticeSession,
  PracticeSessionStorageState,
  PracticeSessionStore,
  PracticeStageDraft,
  PracticeStageDraftMap,
  PracticeStageHintResult,
  PracticeStageId,
  PracticeStageValidationResult,
} from "../model/types";

type PracticeCoachStore = Record<string, PracticeCoachStageStateMap>;
type PracticeFullDesignReviewRuntimeState = Pick<
  PracticePlaygroundViewModel["assistant"]["fullDesignReview"],
  "error" | "result" | "status"
>;
type PracticeFullDesignReviewStore =
  Record<string, PracticeFullDesignReviewRuntimeState>;

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

const createEmptyFullDesignReviewState =
  (): PracticeFullDesignReviewRuntimeState => ({
    error: null,
    result: null,
    status: "idle",
  });

const mergeCoachStateWithDraftFeedback = (
  coachState: PracticeCoachStageStateMap,
  drafts: PracticeStageDraftMap | null,
): PracticeCoachStageStateMap =>
  practiceStages.reduce<PracticeCoachStageStateMap>((mergedState, stage) => {
    const currentStageState =
      coachState[stage.id] ?? createEmptyCoachStageState();
    const persistedHintResult = drafts?.[stage.id]?.hintResult ?? null;
    const persistedValidationResult =
      drafts?.[stage.id]?.validationResult ?? null;
    const hintResult = currentStageState.hintResult ?? persistedHintResult;
    const validationResult =
      currentStageState.validationResult ?? persistedValidationResult;

    mergedState[stage.id] = {
      ...currentStageState,
      hintResult,
      hintStatus:
        currentStageState.hintStatus === "idle" && hintResult
          ? "success"
          : currentStageState.hintStatus,
      validationResult,
      validationStatus:
        currentStageState.validationStatus === "idle" && validationResult
          ? "success"
          : currentStageState.validationStatus,
    };

    return mergedState;
  }, {} as PracticeCoachStageStateMap);

const countWords = (value: string): number =>
  value.split(/\s+/).filter(Boolean).length;

const buildStageDraftPlainText = (
  stageId: PracticeStageId,
  draft: PracticeStageDraft,
): string =>
  [
    richTextToPlainText(draft.notes),
    stageId === "high-level-design"
      ? summarizeSystemDesignDiagram(draft.diagram)
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

const createBrowserSessionsSnapshot = (
  sessions: PracticeSessionStore,
): string =>
  JSON.stringify(
    Object.entries(sessions)
      .sort(([leftProblemId], [rightProblemId]) =>
        leftProblemId.localeCompare(rightProblemId),
      )
      .map(([problemId, session]) => [
        problemId,
        createPracticeSessionSnapshot(normalizePracticeSession(session)),
      ]),
  );

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

interface UsePracticePlaygroundOptions {
  onSessionReset?: () => void;
}

export const usePracticePlayground = (
  problem: PracticeProblem | null,
  options: UsePracticePlaygroundOptions = {},
): PracticePlaygroundViewModel => {
  const { isApiAuthReady } = useAppAuth();
  const toast = useToast();
  const [triggerGenerateStageHints] = useGenerateStageHintsMutation();
  const [triggerFullDesignReview] = useReviewFullDesignMutation();
  const [triggerValidateStageDraft] = useValidateStageDraftMutation();
  const [deletePracticeSession, deletePracticeSessionState] =
    useDeletePracticeSessionMutation();
  const [savePracticeSession, savePracticeSessionState] =
    useUpsertPracticeSessionMutation();
  const [sessions, setSessions] = useState<PracticeSessionStore>({});
  const [isBrowserSessionsLoading, setIsBrowserSessionsLoading] =
    useState(true);
  const [isBrowserSessionsSaving, setIsBrowserSessionsSaving] =
    useState(false);
  const [browserSessionsErrorMessage, setBrowserSessionsErrorMessage] =
    useState<string | null>(null);
  const [coachStateByProblemId, setCoachStateByProblemId] =
    useState<PracticeCoachStore>({});
  const [fullReviewStateByProblemId, setFullReviewStateByProblemId] =
    useState<PracticeFullDesignReviewStore>({});
  const [remoteSession, setRemoteSession] = useState<PracticeSession | null>(
    null,
  );
  const [persistedRemoteSnapshot, setPersistedRemoteSnapshot] = useState<
    string | null
  >(null);
  const { data: billingAccount } = useGetBillingAccountQuery(undefined, {
    skip: !frontendConfig.features.billing || !isApiAuthReady,
  });
  const hasCloudSync =
    !frontendConfig.features.billing ||
    Boolean(billingAccount?.entitlements.cloudSync);
  const hasEditorialAccess =
    !frontendConfig.features.billing ||
    Boolean(billingAccount?.entitlements.editorials);
  const hasAdvancedReview =
    !frontendConfig.features.billing ||
    Boolean(billingAccount?.entitlements.advancedReview);
  const shouldUseRemotePersistence = isApiAuthReady && hasCloudSync;
  const {
    data: persistedSession,
    error: persistedSessionError,
    isFetching: isPersistedSessionFetching,
    isLoading: isPersistedSessionLoading,
  } = useGetPracticeSessionQuery(problem?.id ?? "", {
    skip: !shouldUseRemotePersistence || !problem,
  });
  const lastPersistedSessionErrorRef = useRef<string | null>(null);
  const lastSaveErrorRef = useRef<string | null>(null);
  const browserSessionsSnapshotRef = useRef(createBrowserSessionsSnapshot({}));
  const browserSessionsSaveIdRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;

    const loadSessions = async (): Promise<void> => {
      setIsBrowserSessionsLoading(true);

      try {
        const storedSessions = await loadBrowserPracticeSessions();

        if (isCancelled) {
          return;
        }

        browserSessionsSnapshotRef.current =
          createBrowserSessionsSnapshot(storedSessions);
        setSessions((currentSessions) => ({
          ...currentSessions,
          ...storedSessions,
        }));
        setBrowserSessionsErrorMessage(null);
      } catch {
        if (!isCancelled) {
          setBrowserSessionsErrorMessage(
            "Unable to load saved playground notes from this browser.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsBrowserSessionsLoading(false);
        }
      }
    };

    void loadSessions();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isBrowserSessionsLoading || shouldUseRemotePersistence) {
      return;
    }

    const currentSnapshot = createBrowserSessionsSnapshot(sessions);

    if (currentSnapshot === browserSessionsSnapshotRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const saveId = browserSessionsSaveIdRef.current + 1;
      browserSessionsSaveIdRef.current = saveId;
      setIsBrowserSessionsSaving(true);

      const persistSessions = async (): Promise<void> => {
        try {
          await saveBrowserPracticeSessions(sessions);

          if (browserSessionsSaveIdRef.current === saveId) {
            browserSessionsSnapshotRef.current = currentSnapshot;
            setBrowserSessionsErrorMessage(null);
          }
        } catch {
          if (browserSessionsSaveIdRef.current === saveId) {
            setBrowserSessionsErrorMessage(
              "Unable to save playground notes in this browser.",
            );
          }
        } finally {
          if (browserSessionsSaveIdRef.current === saveId) {
            setIsBrowserSessionsSaving(false);
          }
        }
      };

      void persistSessions();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isBrowserSessionsLoading, sessions, shouldUseRemotePersistence]);

  const browserSession = useMemo<PracticeSession | null>(() => {
    if (!problem) {
      return null;
    }

    return sessions[problem.id] ?? createDefaultSession();
  }, [problem, sessions]);

  useEffect(() => {
    if (!shouldUseRemotePersistence) {
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
  }, [problem?.id, shouldUseRemotePersistence]);

  useEffect(() => {
    if (!shouldUseRemotePersistence || !problem) {
      return;
    }

    if (isPersistedSessionLoading || isPersistedSessionFetching) {
      return;
    }

    const nextSession = normalizePracticeSession(
      fromPersistedPracticeSession(persistedSession ?? null) ??
        createDefaultSession(),
    );
    const nextSnapshot = createPracticeSessionSnapshot(nextSession);

    if (remoteSession) {
      setPersistedRemoteSnapshot((currentSnapshot) =>
        currentSnapshot ?? nextSnapshot,
      );
      return;
    }

    setRemoteSession(nextSession);
    setPersistedRemoteSnapshot(nextSnapshot);
  }, [
    isPersistedSessionFetching,
    isPersistedSessionLoading,
    persistedSession,
    problem,
    remoteSession,
    shouldUseRemotePersistence,
  ]);

  useEffect(() => {
    if (!shouldUseRemotePersistence || !persistedSessionError) {
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
  }, [persistedSessionError, shouldUseRemotePersistence, toast]);

  const session = useMemo<PracticeSession | null>(() => {
    if (!problem) {
      return null;
    }

    if (shouldUseRemotePersistence) {
      return remoteSession;
    }

    return browserSession;
  }, [browserSession, problem, remoteSession, shouldUseRemotePersistence]);

  const activeStage = useMemo(() => {
    if (!session) {
      return practiceStages[0];
    }

    return (
      practiceStages.find((stage) => stage.id === session.activeStageId) ??
      practiceStages[0]
    );
  }, [session]);
  const {
    currentData: currentStageEditorial,
    error: stageEditorialError,
    isFetching: isStageEditorialFetching,
    isLoading: isStageEditorialLoading,
  } = useGetStageEditorialQuery(
    {
      problemId: problem?.id ?? "",
      stageId: activeStage.id,
    },
    {
      skip: !isApiAuthReady || !hasEditorialAccess || !problem,
    },
  );

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

    return mergeCoachStateWithDraftFeedback(
      coachStateByProblemId[problem.id] ?? createEmptyCoachStateMap(),
      session?.stages ?? null,
    );
  }, [coachStateByProblemId, problem, session?.stages]);

  const activeStageState = useMemo(
    () => coachState[activeStage.id],
    [activeStage.id, coachState],
  );

  const activeStagePlainText = useMemo(
    () => buildStageDraftPlainText(activeStage.id, activeStageDraft),
    [activeStage.id, activeStageDraft],
  );
  const draftWordCount = useMemo(
    () => countWords(activeStagePlainText),
    [activeStagePlainText],
  );
  const fullDesignStageSubmissions = useMemo(
    () =>
      session
        ? practiceStages.map((stage) => ({
            stageId: stage.id,
            stageTitle: stage.title,
            submission: buildStageDraftPlainText(stage.id, session.stages[stage.id]),
          }))
        : [],
    [session],
  );
  const fullDesignSourceDraft = useMemo(
    () =>
      fullDesignStageSubmissions
        .map((stage) =>
          [
            `${stage.stageTitle}:`,
            stage.submission.trim() || "[empty]",
          ].join("\n"),
        )
        .join("\n\n"),
    [fullDesignStageSubmissions],
  );
  const fullDesignWordCount = useMemo(
    () => countWords(fullDesignSourceDraft),
    [fullDesignSourceDraft],
  );
  const fullDesignReviewRuntimeState = problem
    ? (fullReviewStateByProblemId[problem.id] ??
      createEmptyFullDesignReviewState())
    : createEmptyFullDesignReviewState();
  const fullDesignReview = useMemo(
    () => ({
      ...fullDesignReviewRuntimeState,
      canRequest:
        hasAdvancedReview &&
        fullDesignWordCount >= 80 &&
        fullDesignReviewRuntimeState.status !== "loading",
      isAvailable: hasAdvancedReview,
      wordCount: fullDesignWordCount,
    }),
    [
      fullDesignReviewRuntimeState,
      fullDesignWordCount,
      hasAdvancedReview,
    ],
  );

  const updateSession = (
    updater: (current: PracticeSession) => PracticeSession,
  ): void => {
    if (!problem) {
      return;
    }

    if (!shouldUseRemotePersistence && isBrowserSessionsLoading) {
      return;
    }

    if (shouldUseRemotePersistence) {
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
    if (
      !shouldUseRemotePersistence ||
      !problem ||
      !remoteSession ||
      !persistedRemoteSnapshot
    ) {
      return;
    }

    const currentSnapshot = createPracticeSessionSnapshot(remoteSession);

    if (currentSnapshot === persistedRemoteSnapshot) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const persistSession = async (): Promise<void> => {
        try {
          await savePracticeSession({
            problemId: problem.id,
            session: toPersistedPracticeSessionInput(remoteSession),
          }).unwrap();
          setPersistedRemoteSnapshot(currentSnapshot);
        } catch {
          return;
        }
      };

      void persistSession();
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    persistedRemoteSnapshot,
    problem,
    remoteSession,
    savePracticeSession,
    shouldUseRemotePersistence,
  ]);

  useEffect(() => {
    if (!shouldUseRemotePersistence || !savePracticeSessionState.error) {
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
  }, [savePracticeSessionState.error, shouldUseRemotePersistence, toast]);

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

  const updateFullDesignReviewState = (
    updater: (
      current: PracticeFullDesignReviewRuntimeState,
    ) => PracticeFullDesignReviewRuntimeState,
  ): void => {
    if (!problem) {
      return;
    }

    setFullReviewStateByProblemId((currentState) => {
      const currentProblemState =
        currentState[problem.id] ?? createEmptyFullDesignReviewState();

      return {
        ...currentState,
        [problem.id]: updater(currentProblemState),
      };
    });
  };

  const updateStageFeedback = (
    stageId: PracticeStageId,
    feedback: {
      hintResult?: PracticeStageHintResult | null;
      validationResult?: PracticeStageValidationResult | null;
    },
  ): void => {
    updateSession((current) => {
      const currentStageDraft = current.stages[stageId];

      return {
        ...current,
        updatedAt: new Date().toISOString(),
        stages: {
          ...current.stages,
          [stageId]: {
            ...currentStageDraft,
            ...(feedback.hintResult !== undefined
              ? { hintResult: feedback.hintResult }
              : {}),
            ...(feedback.validationResult !== undefined
              ? { validationResult: feedback.validationResult }
              : {}),
          },
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

  const updateActiveStageDiagram = (
    diagram: SystemDesignDiagram | null,
  ): void => {
    updateSession((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      stages: {
        ...current.stages,
        [current.activeStageId]: {
          ...current.stages[current.activeStageId],
          diagram: normalizeSystemDesignDiagram(diagram),
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
      shouldUseRemotePersistence
        ? `Clear the saved playground notes for ${problem.title} from your account?`
        : `Clear the saved playground notes for ${problem.title}?`,
    );

    if (!shouldReset) {
      return;
    }

    options.onSessionReset?.();

    if (shouldUseRemotePersistence) {
      const nextSession = createDefaultSession();
      setRemoteSession(nextSession);
      setPersistedRemoteSnapshot(createPracticeSessionSnapshot(nextSession));

      const resetRemoteSession = async (): Promise<void> => {
        try {
          await deletePracticeSession(problem.id).unwrap();
          toast.success("Saved playground notes cleared.", {
            title: "Session Reset",
          });
        } catch (error) {
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
        }
      };

      void resetRemoteSession();
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
    setFullReviewStateByProblemId((currentState) => {
      const nextState = { ...currentState };
      delete nextState[problem.id];
      return nextState;
    });
  };

  const storage = useMemo<PracticeSessionStorageState>(() => {
    const errorSource =
      savePracticeSessionState.error ??
      deletePracticeSessionState.error ??
      persistedSessionError;
    const remoteErrorMessage = errorSource
      ? getApiErrorDetails(errorSource, "Unable to sync saved playground notes.")
          .message
      : null;
    const errorMessage = shouldUseRemotePersistence
      ? remoteErrorMessage
      : browserSessionsErrorMessage;
    const hasPendingRemoteChanges =
      shouldUseRemotePersistence &&
      remoteSession !== null &&
      persistedRemoteSnapshot !== null &&
      createPracticeSessionSnapshot(remoteSession) !== persistedRemoteSnapshot;
    const isLoading = shouldUseRemotePersistence
      ? Boolean(problem) &&
        remoteSession === null &&
        (isPersistedSessionLoading || isPersistedSessionFetching)
      : Boolean(problem) && isBrowserSessionsLoading;
    const isSaving = shouldUseRemotePersistence
      ? savePracticeSessionState.isLoading ||
        deletePracticeSessionState.isLoading ||
        hasPendingRemoteChanges
      : isBrowserSessionsSaving;

    return {
      errorMessage,
      isLoading,
      isRemote: shouldUseRemotePersistence,
      isSaving,
      statusLabel: errorMessage
        ? "Save failed"
        : isLoading
          ? "Loading..."
          : isSaving
            ? "Saving..."
            : "Saved",
      statusTone: errorMessage
        ? "error"
        : isLoading
          ? "loading"
          : isSaving
            ? "saving"
            : shouldUseRemotePersistence
              ? "saved"
              : "local",
    };
  }, [
    browserSessionsErrorMessage,
    deletePracticeSessionState.error,
    deletePracticeSessionState.isLoading,
    isBrowserSessionsLoading,
    isBrowserSessionsSaving,
    isPersistedSessionFetching,
    isPersistedSessionLoading,
    persistedSessionError,
    persistedRemoteSnapshot,
    problem,
    remoteSession,
    savePracticeSessionState.error,
    savePracticeSessionState.isLoading,
    shouldUseRemotePersistence,
  ]);

  if (!problem) {
    return {
      actions: {
        goToNextStage: () => undefined,
        goToPreviousStage: () => undefined,
        resetSession: () => undefined,
        setActiveStage: () => undefined,
        toggleStageComplete: () => undefined,
        updateActiveStageDiagram: () => undefined,
        updateActiveStageNotes: () => undefined,
      },
      activeStage: practiceStages[0],
      activeStageDraft: createDefaultSession().stages[practiceStages[0].id],
      assistant: {
        actions: {
          clearActiveStageFeedback: () => undefined,
          clearFullDesignReview: () => undefined,
          reloadHints: async () => undefined,
          reloadValidation: async () => undefined,
          requestFullDesignReview: async () => undefined,
          requestHints: async () => undefined,
          retryFullDesignReview: async () => undefined,
          retryHints: async () => undefined,
          retryValidation: async () => undefined,
          validateDraft: async () => undefined,
        },
        activeStageState: createEmptyCoachStageState(),
        canRequestHints: false,
        canValidateDraft: false,
        currentDraft: "",
        draftWordCount: 0,
        fullDesignReview: {
          ...createEmptyFullDesignReviewState(),
          canRequest: false,
          isAvailable: false,
          wordCount: 0,
        },
        hasAnyFeedback: false,
        isHintStale: false,
        isValidationStale: false,
      },
      editorial: {
        contentHtml: null,
        errorMessage: null,
        isLocked: false,
        isLoading: false,
        title: null,
        updatedAt: null,
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
    if (!problem) {
      return;
    }

    const stageId = activeStage.id;
    const sourceDraft = activeStagePlainText;

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
      const hintResult: PracticeStageHintResult = {
        ...response.data,
        meta: response.meta,
        receivedAt: new Date().toISOString(),
        sourceDraft,
      };

      updateCoachState(stageId, (current) => ({
        ...current,
        hintError: null,
        hintResult,
        hintStatus: "success",
      }));
      updateStageFeedback(stageId, { hintResult });
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
      const validationResult: PracticeStageValidationResult = {
        ...response.data,
        meta: response.meta,
        receivedAt: new Date().toISOString(),
        sourceDraft,
      };

      updateCoachState(stageId, (current) => ({
        ...current,
        validationError: null,
        validationResult,
        validationStatus: "success",
      }));
      updateStageFeedback(stageId, { validationResult });
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

  const requestFullDesignReview = async (): Promise<void> => {
    if (!problem || fullDesignWordCount < 80 || !hasAdvancedReview) {
      return;
    }

    const sourceDraft = fullDesignSourceDraft;

    updateFullDesignReviewState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const response = await triggerFullDesignReview({
        problem,
        stages: fullDesignStageSubmissions,
      }).unwrap();
      const result: PracticeFullDesignReviewResult = {
        ...response.data,
        meta: response.meta,
        receivedAt: new Date().toISOString(),
        sourceDraft,
      };

      updateFullDesignReviewState(() => ({
        error: null,
        result,
        status: "success",
      }));
      toast.success("Full design review is ready.", {
        title: "Advanced Review Complete",
      });
    } catch (error) {
      const reviewError = toPracticeAiRequestError(
        error,
        "Unable to review the full design right now.",
      );

      updateFullDesignReviewState((current) => ({
        ...current,
        error: reviewError,
        status: "error",
      }));
      toast.error(reviewError.message, {
        dedupeKey: "practice-full-design-review-error",
        title: "Advanced Review Failed",
      });
    }
  };

  const retryHints = async (): Promise<void> => {
    await requestHints();
  };

  const retryFullDesignReview = async (): Promise<void> => {
    await requestFullDesignReview();
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
    updateStageFeedback(activeStage.id, {
      hintResult: null,
      validationResult: null,
    });
  };

  const clearFullDesignReview = (): void => {
    updateFullDesignReviewState(() => createEmptyFullDesignReviewState());
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
      updateActiveStageDiagram,
      updateActiveStageNotes,
    },
    activeStage,
    activeStageDraft,
    assistant: {
      actions: {
        clearActiveStageFeedback,
        clearFullDesignReview,
        reloadHints,
        reloadValidation,
        requestFullDesignReview,
        requestHints,
        retryFullDesignReview,
        retryHints,
        retryValidation,
        validateDraft,
      },
      activeStageState,
      canRequestHints: activeStageState.hintStatus !== "loading",
      canValidateDraft:
        activeStagePlainText.length >= 20 &&
        activeStageState.validationStatus !== "loading",
      currentDraft: activeStagePlainText,
      draftWordCount,
      fullDesignReview,
      hasAnyFeedback,
      isHintStale,
      isValidationStale,
    },
    editorial: {
      contentHtml: hasEditorialAccess
        ? (currentStageEditorial?.contentHtml ?? null)
        : null,
      errorMessage: stageEditorialError
        ? getApiErrorDetails(
            stageEditorialError,
            "Unable to load the stage editorial.",
          ).message
        : null,
      isLocked: !hasEditorialAccess,
      isLoading:
        isApiAuthReady &&
        hasEditorialAccess &&
        Boolean(problem) &&
        (isStageEditorialLoading ||
          (isStageEditorialFetching && !currentStageEditorial)),
      title: hasEditorialAccess
        ? (currentStageEditorial?.title || null)
        : null,
      updatedAt: hasEditorialAccess
        ? (currentStageEditorial?.updatedAt ?? null)
        : null,
    },
    metrics,
    session,
    storage,
    stageContextCards,
    stages: practiceStages,
    drafts: session?.stages ?? null,
  };
};
