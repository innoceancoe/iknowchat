import pg from "pg";
import { env } from "./env";

const { Pool } = pg;

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

db.on("error", (err) => {
  console.error("[Postgres] Pool error:", err.message);
});

/** Run a parameterised query and return rows. */
export async function query<T extends pg.QueryResultRow>(
  sql: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await db.query<T>(sql, values as pg.QueryConfigValues<unknown[]>);
  return result.rows;
}

/** Run a query and return the first row or null. */
export async function queryOne<T extends pg.QueryResultRow>(
  sql: string,
  values?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, values);
  return rows[0] ?? null;
}
