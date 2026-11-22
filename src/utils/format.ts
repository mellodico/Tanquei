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
