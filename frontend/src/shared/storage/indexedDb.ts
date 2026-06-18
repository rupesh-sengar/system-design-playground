const DATABASE_NAME = "system-design-lab";
const DATABASE_VERSION = 1;

export const INDEXED_DB_STORES = {
  keyValue: "keyValue",
  practiceSessions: "practiceSessions",
} as const;

type IndexedDbStoreName =
  (typeof INDEXED_DB_STORES)[keyof typeof INDEXED_DB_STORES];

interface KeyValueRecord<TValue> {
  key: string;
  updatedAt: string;
  value: TValue;
}

let databasePromise: Promise<IDBDatabase> | null = null;

export const canUseIndexedDb = (): boolean =>
  typeof window !== "undefined" && Boolean(window.indexedDB);

const createUnavailableError = (): Error =>
  new Error("IndexedDB is not available in this browser context.");

const getRequestError = (request: IDBRequest): Error =>
  request.error ?? new Error("IndexedDB request failed.");

const getTransactionError = (transaction: IDBTransaction): Error =>
  transaction.error ?? new Error("IndexedDB transaction failed.");

const requestToPromise = <TValue>(request: IDBRequest<TValue>): Promise<TValue> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(getRequestError(request));
  });

const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(getTransactionError(transaction));
    transaction.onabort = () => reject(getTransactionError(transaction));
  });

const ensureObjectStores = (database: IDBDatabase): void => {
  if (!database.objectStoreNames.contains(INDEXED_DB_STORES.keyValue)) {
    database.createObjectStore(INDEXED_DB_STORES.keyValue, {
      keyPath: "key",
    });
  }

  if (!database.objectStoreNames.contains(INDEXED_DB_STORES.practiceSessions)) {
    database.createObjectStore(INDEXED_DB_STORES.practiceSessions, {
      keyPath: "problemId",
    });
  }
};

const openDatabase = (): Promise<IDBDatabase> => {
  if (!canUseIndexedDb()) {
    return Promise.reject(createUnavailableError());
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        ensureObjectStores(request.result);
      };

      request.onsuccess = () => {
        const database = request.result;

        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };

        resolve(database);
      };

      request.onerror = () => {
        databasePromise = null;
        reject(getRequestError(request));
      };

      request.onblocked = () => {
        databasePromise = null;
        reject(new Error("IndexedDB upgrade is blocked by another tab."));
      };
    });
  }

  return databasePromise;
};

export const getIndexedDbRecord = async <TRecord>(
  storeName: IndexedDbStoreName,
  key: IDBValidKey,
): Promise<TRecord | null> => {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readonly");
  const request = transaction.objectStore(storeName).get(key);
  const result = await requestToPromise<TRecord | undefined>(request);

  return result ?? null;
};

export const getAllIndexedDbRecords = async <TRecord>(
  storeName: IndexedDbStoreName,
): Promise<TRecord[]> => {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readonly");
  const request = transaction.objectStore(storeName).getAll();

  return requestToPromise<TRecord[]>(request);
};

export const putIndexedDbRecord = async <TRecord>(
  storeName: IndexedDbStoreName,
  record: TRecord,
): Promise<void> => {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readwrite");

  transaction.objectStore(storeName).put(record);
  await waitForTransaction(transaction);
};

export const deleteIndexedDbRecord = async (
  storeName: IndexedDbStoreName,
  key: IDBValidKey,
): Promise<void> => {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readwrite");

  transaction.objectStore(storeName).delete(key);
  await waitForTransaction(transaction);
};

export const replaceIndexedDbRecords = async <TRecord>(
  storeName: IndexedDbStoreName,
  records: TRecord[],
): Promise<void> => {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readwrite");
  const objectStore = transaction.objectStore(storeName);

  objectStore.clear();

  for (const record of records) {
    objectStore.put(record);
  }

  await waitForTransaction(transaction);
};

export const getIndexedDbValue = async <TValue>(
  key: string,
): Promise<TValue | null> => {
  const record = await getIndexedDbRecord<KeyValueRecord<TValue>>(
    INDEXED_DB_STORES.keyValue,
    key,
  );

  return record?.value ?? null;
};

export const setIndexedDbValue = async <TValue>(
  key: string,
  value: TValue,
): Promise<void> => {
  await putIndexedDbRecord<KeyValueRecord<TValue>>(
    INDEXED_DB_STORES.keyValue,
    {
      key,
      updatedAt: new Date().toISOString(),
      value,
    },
  );
};

export const deleteIndexedDbValue = async (key: string): Promise<void> => {
  await deleteIndexedDbRecord(INDEXED_DB_STORES.keyValue, key);
};
