import { useEffect, useRef, useState } from "react";
import {
  canUseIndexedDb,
  getIndexedDbValue,
  setIndexedDbValue,
} from "@/shared/storage/indexedDb";

const parseStoredIds = (value: unknown): Set<string> => {
  if (!Array.isArray(value)) {
    return new Set();
  }

  return new Set(
    value.filter((item): item is string => typeof item === "string"),
  );
};

const readLegacyIds = (storageKey: string): Set<string> => {
  try {
    return parseStoredIds(
      JSON.parse(window.localStorage.getItem(storageKey) ?? "[]"),
    );
  } catch {
    return new Set();
  }
};

const writeLegacyIds = (storageKey: string, values: Set<string>): void => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...values]));
  } catch {
    return;
  }
};

const removeLegacyIds = (storageKey: string): void => {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    return;
  }
};

const loadStoredIds = async (storageKey: string): Promise<Set<string>> => {
  const legacyIds = readLegacyIds(storageKey);

  if (!canUseIndexedDb()) {
    return legacyIds;
  }

  try {
    const indexedDbIds = parseStoredIds(
      await getIndexedDbValue<unknown>(storageKey),
    );
    const ids = new Set([...legacyIds, ...indexedDbIds]);

    if (legacyIds.size > 0) {
      await setIndexedDbValue(storageKey, [...ids]);
      removeLegacyIds(storageKey);
    }

    return ids;
  } catch {
    return legacyIds;
  }
};

const saveStoredIds = async (
  storageKey: string,
  values: Set<string>,
): Promise<void> => {
  if (!canUseIndexedDb()) {
    writeLegacyIds(storageKey, values);
    return;
  }

  try {
    await setIndexedDbValue(storageKey, [...values]);
    removeLegacyIds(storageKey);
  } catch {
    writeLegacyIds(storageKey, values);
  }
};

export interface PersistentIdSet {
  values: Set<string>;
  clear: () => void;
  errorMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  toggle: (value: string) => void;
}

export const usePersistentIdSet = (storageKey: string): PersistentIdSet => {
  const [values, setValues] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const saveIdRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;

    const loadValues = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const storedValues = await loadStoredIds(storageKey);

        if (isCancelled) {
          return;
        }

        setValues((currentValues) =>
          currentValues.size > 0
            ? new Set([...storedValues, ...currentValues])
            : storedValues,
        );
        setErrorMessage(null);
      } catch {
        if (!isCancelled) {
          setErrorMessage("Unable to load saved progress in this browser.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadValues();

    return () => {
      isCancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const saveId = saveIdRef.current + 1;
      saveIdRef.current = saveId;
      setIsSaving(true);

      const persistValues = async (): Promise<void> => {
        try {
          await saveStoredIds(storageKey, values);

          if (saveIdRef.current === saveId) {
            setErrorMessage(null);
          }
        } catch {
          if (saveIdRef.current === saveId) {
            setErrorMessage("Unable to save progress in this browser.");
          }
        } finally {
          if (saveIdRef.current === saveId) {
            setIsSaving(false);
          }
        }
      };

      void persistValues();
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoading, storageKey, values]);

  const toggle = (value: string): void => {
    setValues((current) => {
      const next = new Set(current);

      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }

      return next;
    });
  };

  const clear = (): void => {
    setValues(new Set());
  };

  return {
    values,
    clear,
    errorMessage,
    isLoading,
    isSaving,
    toggle,
  };
};
