import { describe, expect, it, vi } from "vitest";
import { TtlCache, parseTrustProxy, roundCoord } from "./cache";

describe("TtlCache", () => {
  it("guarda o valor até o TTL expirar", async () => {
    let t = 0;
    const cache = new TtlCache<number>(1_000, 10, () => t);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.getOrLoad("k", load)).toEqual({ value: 1, hit: false });
    t = 999;
    expect(await cache.getOrLoad("k", load)).toEqual({ value: 1, hit: true });
    t = 1_000;
    expect(await cache.getOrLoad("k", load)).toEqual({ value: 2, hit: false });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("chamadas simultâneas compartilham a mesma carga", async () => {
    const cache = new TtlCache<string>(1_000);
    let resolve!: (v: string) => void;
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const a = cache.getOrLoad("k", load);
    const b = cache.getOrLoad("k", load);
    resolve("ok");
    expect(await a).toEqual({ value: "ok", hit: false });
    expect(await b).toEqual({ value: "ok", hit: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("não guarda erros", async () => {
    const cache = new TtlCache<number>(1_000);
    await expect(cache.getOrLoad("k", () => Promise.reject(new Error("falha")))).rejects.toThrow("falha");
    expect(await cache.getOrLoad("k", async () => 7)).toEqual({ value: 7, hit: false });
  });

  it("descarta a entrada usada há mais tempo ao passar do limite", async () => {
    const cache = new TtlCache<string>(60_000, 2);
    await cache.getOrLoad("a", async () => "a");
    await cache.getOrLoad("b", async () => "b");
    await cache.getOrLoad("a", async () => "x"); // "a" vira a mais recente
    await cache.getOrLoad("c", async () => "c"); // descarta "b"
    expect((await cache.getOrLoad("a", async () => "novo")).hit).toBe(true);
    expect((await cache.getOrLoad("b", async () => "novo")).hit).toBe(false);
  });

  it("TTL 0 desativa o cache", async () => {
    const cache = new TtlCache<number>(0);
    const load = vi.fn(async () => 1);
    await cache.getOrLoad("k", load);
    await cache.getOrLoad("k", load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("roundCoord", () => {
  it("arredonda para 2 casas", () => {
    expect(roundCoord(-9.64981)).toBe(-9.65);
    expect(roundCoord(-35.7348)).toBe(-35.73);
  });
});

describe("parseTrustProxy", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    ["true", true],
    ["1", 1],
    ["loopback, 10.0.0.0/8", "loopback, 10.0.0.0/8"],
  ])("%s → %s", (input, expected) => {
    expect(parseTrustProxy(input)).toEqual(expected);
  });
});
