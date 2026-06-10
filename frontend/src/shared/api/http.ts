import { frontendConfig } from "@/config/env";

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

type ErrorPayload = {
  error?: string;
};

interface JsonRequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeoutMs?: number;
}

type AccessTokenResolver = () => Promise<string | null>;
type RtkQueryErrorPayload = {
  error?: string;
  kind?: ApiErrorKind;
  retryable?: boolean;
  statusCode?: number | null;
};

export type ApiErrorKind =
  | "auth"
  | "forbidden"
  | "network"
  | "payment"
  | "rate-limit"
  | "request"
  | "service"
  | "unknown";

export interface ApiErrorDetails {
  kind: ApiErrorKind;
  message: string;
  retryable: boolean;
  statusCode: number | null;
}

let accessTokenResolver: AccessTokenResolver | null = null;

export class ApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiAuthError";
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiTimeoutError";
  }
}

export const setApiAccessTokenResolver = (
  resolver: AccessTokenResolver | null,
): void => {
  accessTokenResolver = resolver;
};

export const getApiBaseUrl = (): string => {
  return frontendConfig.apiBaseUrl;
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  return getApiErrorDetails(error, fallbackMessage).message;
};

export const getApiErrorDetails = (
  error: unknown,
  fallbackMessage: string,
): ApiErrorDetails => {
  if (typeof error === "object" && error !== null && "status" in error) {
    const rtkError = error as {
      data?: RtkQueryErrorPayload;
      status: number | string;
    };
    const statusCode =
      typeof rtkError.status === "number"
        ? rtkError.status
        : (rtkError.data?.statusCode ?? null);

    if (rtkError.status === "FETCH_ERROR") {
      return {
        kind: rtkError.data?.kind ?? "network",
        message:
          rtkError.data?.error ??
          "Unable to reach the AI service. Check your connection and retry.",
        retryable: rtkError.data?.retryable ?? true,
        statusCode,
      };
    }

    if (rtkError.status === "TIMEOUT_ERROR") {
      return {
        kind: rtkError.data?.kind ?? "network",
        message:
          rtkError.data?.error ??
          "The request timed out before the service responded.",
        retryable: rtkError.data?.retryable ?? true,
        statusCode,
      };
    }

    if (
      rtkError.status === "PARSING_ERROR" ||
      rtkError.status === "CUSTOM_ERROR"
    ) {
      return {
        kind: rtkError.data?.kind ?? "unknown",
        message: rtkError.data?.error ?? fallbackMessage,
        retryable: rtkError.data?.retryable ?? true,
        statusCode,
      };
    }

    if (typeof rtkError.status === "number") {
      if (rtkError.status === 401) {
        return {
          kind: rtkError.data?.kind ?? "auth",
          message:
            rtkError.data?.error ?? "Your session expired. Sign in again.",
          retryable: rtkError.data?.retryable ?? false,
          statusCode,
        };
      }

      if (rtkError.status === 403) {
        return {
          kind: rtkError.data?.kind ?? "forbidden",
          message:
            rtkError.data?.error ??
            "This account is not allowed to use the AI workspace.",
          retryable: rtkError.data?.retryable ?? false,
          statusCode,
        };
      }

      if (rtkError.status === 402) {
        return {
          kind: rtkError.data?.kind ?? "payment",
          message:
            rtkError.data?.error ??
            "Upgrade your plan to use this feature.",
          retryable: rtkError.data?.retryable ?? false,
          statusCode,
        };
      }

      if (rtkError.status === 429) {
        return {
          kind: rtkError.data?.kind ?? "rate-limit",
          message:
            rtkError.data?.error ??
            "Too many AI requests were sent. Wait a moment and retry.",
          retryable: rtkError.data?.retryable ?? true,
          statusCode,
        };
      }

      if (rtkError.status >= 500) {
        return {
          kind: rtkError.data?.kind ?? "service",
          message:
            rtkError.data?.error ??
            "The AI service is temporarily unavailable. Retry shortly.",
          retryable: rtkError.data?.retryable ?? true,
          statusCode,
        };
      }

      return {
        kind: rtkError.data?.kind ?? "request",
        message: rtkError.data?.error ?? fallbackMessage,
        retryable: rtkError.data?.retryable ?? true,
        statusCode,
      };
    }
  }

  if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      return {
        kind: "auth",
        message: error.message || "Your session expired. Sign in again.",
        retryable: false,
        statusCode: error.statusCode,
      };
    }

    if (error.statusCode === 403) {
      return {
        kind: "forbidden",
        message:
          error.message ||
          "This account is not allowed to use the AI workspace.",
        retryable: false,
        statusCode: error.statusCode,
      };
    }

    if (error.statusCode === 402) {
      return {
        kind: "payment",
        message: error.message || "Upgrade your plan to use this feature.",
        retryable: false,
        statusCode: error.statusCode,
      };
    }

    if (error.statusCode === 429) {
      return {
        kind: "rate-limit",
        message:
          error.message ||
          "Too many AI requests were sent. Wait a moment and retry.",
        retryable: true,
        statusCode: error.statusCode,
      };
    }

    if (error.statusCode >= 500) {
      return {
        kind: "service",
        message:
          error.message ||
          "The AI service is temporarily unavailable. Retry shortly.",
        retryable: true,
        statusCode: error.statusCode,
      };
    }

    return {
      kind: "request",
      message: error.message || fallbackMessage,
      retryable: true,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof ApiAuthError) {
    return {
      kind: "auth",
      message: error.message,
      retryable: false,
      statusCode: null,
    };
  }

  if (error instanceof ApiTimeoutError) {
    return {
      kind: "network",
      message: error.message,
      retryable: true,
      statusCode: null,
    };
  }

  if (error instanceof TypeError) {
    return {
      kind: "network",
      message:
        "Unable to reach the AI service. Check your connection and retry.",
      retryable: true,
      statusCode: null,
    };
  }

  if (error instanceof Error) {
    return {
      kind: "unknown",
      message: error.message || fallbackMessage,
      retryable: true,
      statusCode: null,
    };
  }

  return {
    kind: "unknown",
    message: fallbackMessage,
    retryable: true,
    statusCode: null,
  };
};

export const requestJson = async <T>(
  path: string,
  init: JsonRequestOptions = {},
): Promise<T> => {
  const {
    requiresAuth = false,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ...requestInit
  } = init;
  const headers = new Headers(requestInit.headers);

  if (requestInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresAuth) {
    if (!accessTokenResolver) {
      throw new ApiAuthError(
        "Authentication is not configured in the frontend.",
      );
    }

    const accessToken = await accessTokenResolver();

    if (!accessToken) {
      throw new ApiAuthError(
        "Unable to acquire an access token for this request.",
      );
    }

    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const abortController = new AbortController();
  let didTimeout = false;
  const timeoutId = globalThis.setTimeout(() => {
    didTimeout = true;
    abortController.abort();
  }, timeoutMs);
  const forwardAbort = (): void => {
    abortController.abort(requestInit.signal?.reason);
  };

  requestInit.signal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers,
      signal: abortController.signal,
    });

    const isJsonResponse =
      response.headers.get("content-type")?.includes("application/json") ??
      false;
    const payload = isJsonResponse ? ((await response.json()) as unknown) : null;

    if (!response.ok) {
      const errorPayload = payload as ErrorPayload | null;

      throw new ApiError(
        errorPayload?.error ?? `Request failed with status ${response.status}.`,
        response.status,
      );
    }

    return payload as T;
  } catch (error) {
    if (didTimeout) {
      throw new ApiTimeoutError(
        "The backend request timed out before the service responded.",
      );
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    requestInit.signal?.removeEventListener("abort", forwardAbort);
  }
};
