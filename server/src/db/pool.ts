import { Pool } from "pg";

/**
 * Pool de conexões com o Postgres (Neon). Use a string de conexão *pooled*
 * (host com `-pooler`), já que o servidor é de longa duração.
 */
export function createPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000, // computação do Neon pode estar "acordando" (scale to zero)
  });
  pool.on("error", (e) => console.error("Postgres: erro em conexão ociosa:", e.message));
  return pool;
}
