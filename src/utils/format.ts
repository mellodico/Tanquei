const formatters = new Map<number, Intl.NumberFormat>();

/** Formata `value` com `decimals` casas decimais no padrão pt-BR (ex.: 1.234,56). */
export function formatNumber(value: number, decimals = 2): string {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, f);
  }
  return f.format(value);
}

const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** Tempo relativo em pt-BR ("há 5 minutos", "há 3 horas", "ontem"). */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  if (!Number.isFinite(diffMs)) return "";
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 1) return "agora mesmo";
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");
  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");
  return relativeFormatter.format(Math.round(diffMs / 86_400_000), "day");
}

/** Preços com mais de 24 h podem não refletir o valor atual da bomba. */
export const PRECO_ANTIGO_MS = 24 * 60 * 60 * 1000;

export function isStale(iso: string | null, now: number = Date.now()): boolean {
  return iso !== null && now - new Date(iso).getTime() > PRECO_ANTIGO_MS;
}
