const DEFAULT_API_BASE_URL = "http://localhost:8080";

type ErrorPayload = {
  error?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const getApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return DEFAULT_API_BASE_URL;
  }

  return configuredBaseUrl.replace(/\/+$/, "");
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};

export const requestJson = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const isJsonResponse =
    response.headers.get("content-type")?.includes("application/json") ?? false;
  const payload = isJsonResponse ? ((await response.json()) as unknown) : null;

  if (!response.ok) {
    const errorPayload = payload as ErrorPayload | null;

    throw new ApiError(
      errorPayload?.error ??
        `Request failed with status ${response.status}.`,
      response.status,
    );
  }

  return payload as T;
};
