import { useEffect, useState } from "react";

const readStoredIds = (storageKey: string): Set<string> => {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]"));
  } catch {
    return new Set();
  }
};

const writeStoredIds = (storageKey: string, values: Set<string>): void => {
  window.localStorage.setItem(storageKey, JSON.stringify([...values]));
};

export interface PersistentIdSet {
  values: Set<string>;
  clear: () => void;
  toggle: (value: string) => void;
}

export const usePersistentIdSet = (storageKey: string): PersistentIdSet => {
  const [values, setValues] = useState<Set<string>>(() => readStoredIds(storageKey));

  useEffect(() => {
    writeStoredIds(storageKey, values);
  }, [storageKey, values]);

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
    toggle,
  };
};
