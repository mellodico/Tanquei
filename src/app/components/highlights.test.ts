import { describe, expect, it } from "vitest";
import { Navigation2 } from "lucide-react";
import { iconSvg, withHighlights } from "./highlights";
import type { GasStation } from "../../types";

const mk = (id: string, price: number, distance: number | null) =>
  ({ id, price, distance, name: id, address: "", fuel: "", position: null }) as GasStation;

const kinds = (list: GasStation[]) => Object.fromEntries(list.map((s) => [s.id, s.highlights]));

describe("withHighlights", () => {
  it("marca mais barato, mais perto e melhor custo em postos diferentes", () => {
    // barato: 5,50 a 8 km (score 9,90) · perto: 6,50 a 0,5 km (6,825) · equilibrado: 5,80 a 1 km (6,38)
    const out = kinds(withHighlights([mk("barato", 5.5, 8), mk("perto", 6.5, 0.5), mk("equilibrado", 5.8, 1)]));
    expect(out).toEqual({
      barato: ["mais-barato"],
      perto: ["mais-perto"],
      equilibrado: ["melhor-custo"],
    });
  });

  it("um mesmo posto pode acumular destaques", () => {
    const out = kinds(withHighlights([mk("a", 5.0, 0.2), mk("b", 6.0, 3)]));
    expect(out.a).toEqual(["melhor-custo", "mais-barato", "mais-perto"]);
    expect(out.b).toEqual([]);
  });

  it("ignora preço zero e distância desconhecida", () => {
    const out = kinds(withHighlights([mk("zero", 0, 0.1), mk("semDist", 4.0, null), mk("ok", 6.0, 2)]));
    expect(out.zero).toEqual(["mais-perto"]);
    expect(out.semDist).toEqual(["mais-barato"]);
    expect(out.ok).toEqual(["melhor-custo"]);
  });

  it("lista vazia não quebra", () => {
    expect(withHighlights([])).toEqual([]);
  });
});

describe("iconSvg", () => {
  it("gera SVG para o HTML do Leaflet", () => {
    const svg = iconSvg(Navigation2, 12);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="12"');
  });
});
