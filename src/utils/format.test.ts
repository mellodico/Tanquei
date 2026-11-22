import { describe, expect, it } from "vitest";
import { formatNumber } from "./format";

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
