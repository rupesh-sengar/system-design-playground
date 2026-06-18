export const freeStarterProblemIds = new Set([
  "url-shortener",
  "pastebin",
  "rate-limiter",
  "autocomplete",
  "notification-service",
  "feature-flags",
  "session-store",
  "audit-log",
]);

export const isFreeStarterProblem = (problemId: string): boolean =>
  freeStarterProblemIds.has(problemId);
