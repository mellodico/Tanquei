/**
 * Cache em memória com TTL e limite de entradas. Chamadas simultâneas com a mesma chave
 * compartilham a mesma promessa, então a SEFAZ é consultada uma vez só.
 * Erros não são guardados.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, { expiresAt: number; value: T }>();
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  /** Devolve o valor e se veio do cache (`hit`). */
  async getOrLoad(key: string, load: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > this.now()) {
      // Reinsere para manter a ordem de uso recente (descarte LRU)
      this.entries.delete(key);
      this.entries.set(key, entry);
      return { value: entry.value, hit: true };
    }
    if (entry) this.entries.delete(key);

    const pending = this.inFlight.get(key);
    if (pending) return { value: await pending, hit: true };

    const promise = load();
    this.inFlight.set(key, promise);
    try {
      const value = await promise;
      if (this.ttlMs > 0) this.set(key, value);
      return { value, hit: false };
    } finally {
      this.inFlight.delete(key);
    }
  }

  private set(key: string, value: T) {
    this.entries.set(key, { expiresAt: this.now() + this.ttlMs, value });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string;
      this.entries.delete(oldest);
    }
  }
}

/**
 * Arredonda para 2 casas decimais (~1,1 km), para que buscas de usuários próximos
 * reaproveitem a mesma consulta.
 */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Interpreta TRUST_PROXY para `app.set("trust proxy", ...)`:
 * vazio/"false" → false; "true" → true; número → quantidade de proxies;
 * qualquer outro valor (ex.: "loopback", lista de IPs/sub-redes) é repassado como está.
 */
export function parseTrustProxy(value: string | undefined): boolean | number | string {
  const v = value?.trim();
  if (!v || v === "false") return false;
  if (v === "true") return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}
