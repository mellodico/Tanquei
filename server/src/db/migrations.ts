import { readdirSync } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

/** Pasta das migrations (funciona tanto em src/ quanto em dist/) */
export const MIGRATIONS_DIR = path.resolve(__dirname, "..", "..", "migrations");
export const MIGRATIONS_TABLE = "pgmigrations"; // padrão do node-pg-migrate

export function migrationNames(dir = MIGRATIONS_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => /^\d+_.+\.(sql|js|ts)$/.test(f))
    .map((f) => f.replace(/\.(sql|js|ts)$/, ""))
    .sort();
}

/**
 * Falha se houver migrations não aplicadas no banco. O servidor não cria nem altera
 * tabelas: as migrations rodam como passo de deploy (`npm run migrate`).
 */
export async function assertMigrated(pool: Pool, dir = MIGRATIONS_DIR): Promise<void> {
  const expected = migrationNames(dir);
  const exists = await pool.query<{ ok: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS ok",
    [`public.${MIGRATIONS_TABLE}`],
  );
  const applied = new Set<string>();
  if (exists.rows[0]?.ok) {
    const res = await pool.query<{ name: string }>(`SELECT name FROM ${MIGRATIONS_TABLE}`);
    for (const r of res.rows) applied.add(r.name);
  }
  const pending = expected.filter((n) => !applied.has(n));
  if (pending.length > 0) {
    throw new Error(
      `Migrations pendentes no banco: ${pending.join(", ")}. Rode \`npm run migrate\` (em server/) antes de iniciar.`,
    );
  }
}
