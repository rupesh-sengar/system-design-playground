import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import type { AppConfig } from "../config/env.js";
import { ServiceUnavailableError } from "../shared/http/errors.js";

const POOL_CONNECTION_TIMEOUT_MS = 5_000;
const POOL_IDLE_TIMEOUT_MS = 30_000;
const POOL_RECONNECT_BACKOFF_MS = 250;

const RETRYABLE_CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "57P01",
  "57P02",
  "57P03",
]);

const RETRYABLE_CONNECTION_ERROR_MESSAGES = [
  "client has encountered a connection error and is not queryable",
  "connection terminated unexpectedly",
  "connection ended unexpectedly",
  "server closed the connection unexpectedly",
  "terminating connection due to administrator command",
  "timeout",
  "timed out",
];

export interface SqlClient {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
}

export interface DatabaseHealth {
  configured: boolean;
  status: "connected" | "disabled" | "error";
}

type PostgresErrorLike = Error & {
  code?: string;
};

const sleep = async (durationMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const getErrorCode = (error: unknown): string | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
};

const isRetryableConnectionError = (error: unknown): boolean => {
  const errorCode = getErrorCode(error);

  if (errorCode && RETRYABLE_CONNECTION_ERROR_CODES.has(errorCode)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.trim().toLowerCase();

  return RETRYABLE_CONNECTION_ERROR_MESSAGES.some((message) =>
    normalizedMessage.includes(message),
  );
};

export class PostgresDatabase {
  private pool: Pool | null;
  private readonly poolConfig: PoolConfig | null;
  private poolResetPromise: Promise<void> | null = null;

  constructor(config: AppConfig) {
    this.poolConfig = config.postgres.connectionString
      ? {
          connectionString: config.postgres.connectionString,
          connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
          idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
          keepAlive: true,
        }
      : null;
    this.pool = this.poolConfig ? this.createPool() : null;
  }

  async checkHealth(): Promise<DatabaseHealth> {
    if (!this.poolConfig) {
      return {
        configured: false,
        status: "disabled",
      };
    }

    try {
      await this.runQueryWithReconnect("select 1");

      return {
        configured: true,
        status: "connected",
      };
    } catch {
      return {
        configured: true,
        status: "error",
      };
    }
  }

  async query<Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    return this.runQueryWithReconnect<Row>(text, values);
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    let hasRetriedConnection = false;

    while (true) {
      const pool = this.getPool();
      let client: PoolClient | null = null;
      let clientReleased = false;
      let transactionStarted = false;

      const releaseClient = (destroy = false): void => {
        if (!client || clientReleased) {
          return;
        }

        client.release(destroy);
        clientReleased = true;
      };

      try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const result = await callback(client);

        await client.query("COMMIT");
        releaseClient();

        return result;
      } catch (error) {
        const shouldRecyclePool = isRetryableConnectionError(error);

        if (client && transactionStarted) {
          await client.query("ROLLBACK").catch(() => undefined);
        }

        releaseClient(shouldRecyclePool);

        if (!transactionStarted && shouldRecyclePool && !hasRetriedConnection) {
          hasRetriedConnection = true;
          await this.recyclePool(pool, error);
          await sleep(POOL_RECONNECT_BACKOFF_MS);
          continue;
        }

        throw error;
      } finally {
        releaseClient();
      }
    }
  }

  private createPool(): Pool {
    if (!this.poolConfig) {
      throw new ServiceUnavailableError(
        "Postgres is not configured on the API server.",
      );
    }

    const pool = new Pool(this.poolConfig);

    pool.on("error", (error) => {
      console.error("postgres pool error", {
        code: getErrorCode(error),
        error,
      });

      if (!isRetryableConnectionError(error)) {
        return;
      }

      void this.recyclePool(pool, error);
    });

    return pool;
  }

  private getPool(): Pool {
    if (!this.poolConfig) {
      throw new ServiceUnavailableError(
        "Postgres is not configured on the API server.",
      );
    }

    if (!this.pool) {
      this.pool = this.createPool();
    }

    return this.pool;
  }

  private async runQueryWithReconnect<Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    const pool = this.getPool();

    try {
      return await pool.query<Row>(text, [...values]);
    } catch (error) {
      if (!isRetryableConnectionError(error)) {
        throw error;
      }

      await this.recyclePool(pool, error);
      await sleep(POOL_RECONNECT_BACKOFF_MS);

      return this.getPool().query<Row>(text, [...values]);
    }
  }

  private async recyclePool(pool: Pool, error: unknown): Promise<void> {
    if (this.pool !== pool) {
      return;
    }

    console.warn("recycling postgres pool after transient connection error", {
      code: getErrorCode(error),
      message: error instanceof Error ? error.message : "unknown postgres error",
    });

    if (!this.poolResetPromise) {
      this.pool = null;
      this.poolResetPromise = pool
        .end()
        .catch((closeError) => {
          console.error("failed to close postgres pool", {
            closeError,
            triggerError: error,
          });
        })
        .finally(() => {
          this.poolResetPromise = null;
        });
    }

    await this.poolResetPromise;
  }
}
