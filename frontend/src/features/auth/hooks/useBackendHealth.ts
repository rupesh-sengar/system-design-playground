import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type BackendHealthResponse,
  useLazyGetBackendHealthQuery,
} from "../api/backendHealthApi";

const HEALTH_CHECK_SUCCESS_INTERVAL_MS = 30_000;
const HEALTH_CHECK_RETRY_INTERVAL_MS = 4_000;
const MAX_HEALTH_RETRIES = 15;

type BackendConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

interface BackendHealthState {
  errorMessage: string | null;
  lastCheckedAt: string | null;
  providerLabel: string | null;
  retryCount: number;
  status: BackendConnectionStatus;
}

const createIdleState = (): BackendHealthState => ({
  errorMessage: null,
  lastCheckedAt: null,
  providerLabel: null,
  retryCount: 0,
  status: "idle",
});

const formatProviderLabel = (
  response: BackendHealthResponse,
): string | null => {
  if (!response.provider.configured) {
    return null;
  }

  return `${response.provider.provider} / ${response.provider.model}`;
};

const getBackendHealthErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "status" in error) {
    const queryError = error as FetchBaseQueryError;

    if (queryError.status === "FETCH_ERROR") {
      return "Unable to reach the backend.";
    }

    if (queryError.status === "TIMEOUT_ERROR") {
      return "Backend health request timed out.";
    }

    if (queryError.status === "PARSING_ERROR") {
      return "Backend health response could not be parsed.";
    }

    if (typeof queryError.status === "number") {
      if (
        typeof queryError.data === "object" &&
        queryError.data !== null &&
        "error" in queryError.data &&
        typeof queryError.data.error === "string"
      ) {
        return queryError.data.error;
      }

      if (queryError.status >= 500) {
        return "Backend service is temporarily unavailable.";
      }

      return `Backend health check failed with status ${queryError.status}.`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Backend health check failed.";
};

export const useBackendHealth = (enabled: boolean) => {
  const [state, setState] = useState<BackendHealthState>(createIdleState);
  const [triggerHealthCheck] = useLazyGetBackendHealthQuery();
  const providerLabelRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      providerLabelRef.current = null;
      retryCountRef.current = 0;
      setState(createIdleState());
      return;
    }

    let isActive = true;
    let timeoutId: number | null = null;

    const scheduleNextCheck = (delayMs: number): void => {
      timeoutId = window.setTimeout(() => {
        void runHealthCheck();
      }, delayMs);
    };

    const runHealthCheck = async (): Promise<void> => {
      setState((current) => ({
        ...current,
        errorMessage:
          current.status === "connected" ? null : current.errorMessage,
        status:
          current.status === "connected"
            ? "connected"
            : retryCountRef.current > 0
              ? "reconnecting"
              : "connecting",
      }));

      try {
        const response = await triggerHealthCheck().unwrap();

        if (!isActive) {
          return;
        }

        retryCountRef.current = 0;
        providerLabelRef.current = formatProviderLabel(response);

        setState({
          errorMessage: null,
          lastCheckedAt: new Date().toISOString(),
          providerLabel: providerLabelRef.current,
          retryCount: 0,
          status: "connected",
        });

        scheduleNextCheck(HEALTH_CHECK_SUCCESS_INTERVAL_MS);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const nextRetryCount = retryCountRef.current + 1;
        retryCountRef.current = nextRetryCount;

        setState({
          errorMessage: getBackendHealthErrorMessage(error),
          lastCheckedAt: new Date().toISOString(),
          providerLabel: providerLabelRef.current,
          retryCount: nextRetryCount,
          status:
            nextRetryCount >= MAX_HEALTH_RETRIES
              ? "disconnected"
              : "reconnecting",
        });

        if (nextRetryCount < MAX_HEALTH_RETRIES) {
          scheduleNextCheck(HEALTH_CHECK_RETRY_INTERVAL_MS);
        }
      }
    };

    void runHealthCheck();

    return () => {
      isActive = false;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [enabled, triggerHealthCheck]);

  return useMemo(
    () => ({
      ...state,
      hasRetryLimitReached: state.status === "disconnected",
      isConnected: state.status === "connected",
      isRetrying: state.status === "reconnecting",
    }),
    [state],
  );
};
