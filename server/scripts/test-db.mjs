/**
 * Roda os testes de integração numa branch descartável do Neon.
 *
 *   npm run test:db
 *
 * 1. Cria a branch `test-<timestamp>` a partir da `main` (expira sozinha em 1 hora, por segurança)
 * 2. Roda `vitest` com TEST_DATABASE_URL apontando para ela
 *    (os testes aplicam as migrations pendentes, então validam também as migrations contra o esquema de prod)
 * 3. Apaga a branch, mesmo se os testes falharem
 *
 * Requer o Neon CLI autenticado (`neon auth`, ou NEON_API_KEY no CI) e o vínculo em server/.neon
 * (ou NEON_PROJECT_ID).
 */
import { execFileSync, spawnSync } from "node:child_process";

const PARENT = process.env.NEON_TEST_PARENT ?? "main";
const branch = `test-${Date.now()}`;
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const projectArgs = process.env.NEON_PROJECT_ID ? ["--project-id", process.env.NEON_PROJECT_ID] : [];

function neon(args, opts = {}) {
  return execFileSync("neon", [...args, ...projectArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opts });
}

let created = false;
function cleanup() {
  if (!created) return;
  created = false;
  try {
    neon(["branches", "delete", branch]);
    console.log(`\nBranch ${branch} apagada.`);
  } catch {
    console.error(`\nNão foi possível apagar a branch ${branch}; ela expira sozinha em ${expiresAt}.`);
  }
}
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    cleanup();
    process.exit(130);
  });
}

let status = 1;
try {
  console.log(`Criando branch ${branch} a partir de ${PARENT}...`);
  neon(["branches", "create", "--name", branch, "--parent", PARENT, "--expires-at", expiresAt, "-o", "json"]);
  created = true;

  const url = neon(["cs", branch, "--pooled", "--ssl", "verify-full"]).trim().split("\n").pop();
  if (!url?.startsWith("postgres")) throw new Error("Não foi possível obter a string de conexão da branch de teste.");
  if (process.env.DATABASE_URL && url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL igual a DATABASE_URL; abortando para não apagar dados reais.");
  }

  const res = spawnSync("npx", ["vitest", "run", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, TEST_DATABASE_URL: url },
  });
  status = res.status ?? 1;
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
} finally {
  cleanup();
}
process.exit(status);
