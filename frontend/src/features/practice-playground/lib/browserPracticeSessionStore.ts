import {
  INDEXED_DB_STORES,
  canUseIndexedDb,
  getAllIndexedDbRecords,
  replaceIndexedDbRecords,
} from "@/shared/storage/indexedDb";
import type {
  PracticeSession,
  PracticeSessionStore,
} from "../model/types";
import {
  normalizePracticeSession,
  parseStoredSessions,
} from "./session";

const LEGACY_STORAGE_KEY = "system-design-lab.practice-playground";

interface StoredPracticeSessionRecord {
  problemId: string;
  session: PracticeSession;
  updatedAt: string | null;
}

type IndexedDbPracticeSessionRecord = Partial<PracticeSession> & {
  problemId?: unknown;
  session?: unknown;
};

const canUseLocalStorage = (): boolean => typeof window !== "undefined";

const readLegacySessions = (): PracticeSessionStore => {
  if (!canUseLocalStorage()) {
    return {};
  }

  try {
    return parseStoredSessions(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch {
    return {};
  }
};

const writeLegacySessions = (sessions: PracticeSessionStore): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    return;
  }
};

const removeLegacySessions = (): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    return;
  }
};

const isPracticeSession = (value: unknown): value is PracticeSession => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "activeStageId" in value && "stages" in value;
};

const toSessionStore = (
  records: IndexedDbPracticeSessionRecord[],
): PracticeSessionStore =>
  Object.fromEntries(
    records.flatMap((record) => {
      const problemId =
        typeof record.problemId === "string" ? record.problemId : null;
      const session = isPracticeSession(record.session)
        ? record.session
        : isPracticeSession(record)
          ? record
          : null;

      if (!problemId || !session) {
        return [];
      }

      return [[problemId, normalizePracticeSession(session)]];
    }),
  );

const toSessionRecords = (
  sessions: PracticeSessionStore,
): StoredPracticeSessionRecord[] =>
  Object.entries(sessions).map(([problemId, session]) => ({
    problemId,
    session: normalizePracticeSession(session),
    updatedAt: session.updatedAt,
  }));

export const loadBrowserPracticeSessions =
  async (): Promise<PracticeSessionStore> => {
    const legacySessions = readLegacySessions();

    if (!canUseIndexedDb()) {
      return legacySessions;
    }

    try {
      const indexedDbSessions = toSessionStore(
        await getAllIndexedDbRecords<IndexedDbPracticeSessionRecord>(
          INDEXED_DB_STORES.practiceSessions,
        ),
      );
      const sessions = {
        ...legacySessions,
        ...indexedDbSessions,
      };

      if (Object.keys(legacySessions).length > 0) {
        await replaceIndexedDbRecords(
          INDEXED_DB_STORES.practiceSessions,
          toSessionRecords(sessions),
        );
        removeLegacySessions();
      }

      return sessions;
    } catch {
      return legacySessions;
    }
  };

export const saveBrowserPracticeSessions = async (
  sessions: PracticeSessionStore,
): Promise<void> => {
  if (!canUseIndexedDb()) {
    writeLegacySessions(sessions);
    return;
  }

  try {
    await replaceIndexedDbRecords(
      INDEXED_DB_STORES.practiceSessions,
      toSessionRecords(sessions),
    );
    removeLegacySessions();
  } catch {
    writeLegacySessions(sessions);
  }
};
