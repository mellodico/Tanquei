import { describe, expect, it } from "vitest";
import { formatNumber, formatRelativeTime, isStale } from "./format";

describe("formatNumber", () => {
  it("usa ponto para milhar e vírgula para decimais", () => {
    expect(formatNumber(1234.5)).toBe("1.234,50");
    expect(formatNumber(1234567.891)).toBe("1.234.567,89");
  });
  it("respeita o número de casas decimais", () => {
    expect(formatNumber(5.9079)).toBe("5,91");
    expect(formatNumber(2.34, 1)).toBe("2,3");
    expect(formatNumber(-9.6498, 3)).toBe("-9,650");
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-11-22T15:00:00Z");
  it.each([
    ["2026-11-22T14:59:40Z", "agora mesmo"],
    ["2026-11-22T14:55:00Z", "há 5 minutos"],
    ["2026-11-22T12:00:00Z", "há 3 horas"],
    ["2026-11-21T12:00:00Z", "ontem"],
    ["2026-11-19T15:00:00Z", "há 3 dias"],
  ])("%s → %s", (iso, expected) => {
    expect(formatRelativeTime(iso, now)).toBe(expected);
  });
});

describe("isStale", () => {
  const now = Date.parse("2026-11-22T15:00:00Z");
  it("marca preços com mais de 24 h", () => {
    expect(isStale("2026-11-22T10:00:00Z", now)).toBe(false);
    expect(isStale("2026-11-21T14:00:00Z", now)).toBe(true);
    expect(isStale(null, now)).toBe(false);
  });
});
