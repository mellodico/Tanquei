/**
 * Lista de origens do CORS. Cada item é uma origem exata ou um padrão com `*`, que casa com
 * um trecho de letras, números e hífens (nunca com `.`, para não aceitar outro domínio).
 * Ex.: "https://tanquei-*-mellodico.vercel.app" aceita as URLs de pré-visualização da Vercel.
 */
export function parseOrigins(value: string | undefined): string[] {
  return (value ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function originMatcher(patterns: string[]): (origin: string) => boolean {
  const exact = new Set(patterns.filter((p) => !p.includes("*")));
  const regexes = patterns
    .filter((p) => p.includes("*"))
    .map((p) => new RegExp(`^${p.split("*").map(escapeRegex).join("[a-z0-9-]+")}$`, "i"));
  return (origin) => exact.has(origin) || regexes.some((r) => r.test(origin));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
