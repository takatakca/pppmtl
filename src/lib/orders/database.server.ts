/**
 * PPPMTL PostgreSQL connection. SERVER ONLY.
 *
 *   DATABASE_URL   postgres://ppp_app:…@<host>:5432/pppmtl — the limited application role (no SUPERUSER,
 *                  no BYPASSRLS), never the migration/admin user. Schema: db/migrations/0001 → 0003.
 *   PPP_TENANT_ID  optional; the restaurant tenant this deployment serves (default "pppmtl").
 *
 * The tenant is server configuration for this single-merchant site: one Clover merchant, one tenant. It is never
 * read from the browser. When TAKATAK entitlements serve several restaurants, they replace pppTenantId().
 *
 * `pg` is imported lazily so no driver code can reach a browser bundle.
 */
import type { PppSqlPool } from "./postgres-transactions.server";

export function durableOrderStoreConfigured(): boolean {
  return Boolean(process.env["DATABASE_URL"]?.trim());
}

export function pppTenantId(): string {
  return process.env["PPP_TENANT_ID"]?.trim() || "pppmtl";
}

interface PgPoolLike {
  connect(): Promise<{
    query(text: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
    release(): void;
  }>;
  end(): Promise<void>;
}

let poolPromise: Promise<PgPoolLike> | null = null;

async function createPool(connectionString: string): Promise<PgPoolLike> {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
  });
  // An idle client dropped by PostgreSQL (restart, network) must not crash the web server.
  pool.on("error", (error) => console.error("[ppp-db] idle client error:", error.message));
  return pool;
}

/** The shared pool, created on first use. Rejects when DATABASE_URL is not set. */
export async function pppDatabasePool(): Promise<PppSqlPool> {
  const connectionString = process.env["DATABASE_URL"]?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  if (!poolPromise) {
    poolPromise = createPool(connectionString).catch((error: unknown) => {
      poolPromise = null;
      throw error;
    });
  }
  const pool = await poolPromise;
  return {
    async connect() {
      const client = await pool.connect();
      return {
        async query<Row>(statement: string, values?: readonly unknown[]) {
          const result = await client.query(statement, values ? [...values] : undefined);
          return { rows: result.rows as Row[], rowCount: result.rowCount };
        },
        release: () => client.release(),
      };
    },
  };
}

export async function closePppDatabaseForTests(): Promise<void> {
  const pending = poolPromise;
  poolPromise = null;
  if (pending) await (await pending).end();
}
