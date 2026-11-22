import { DollarSign, Navigation2, TrendingDown, type LucideIcon } from "lucide-react";
import type { GasStation, HighlightKind } from "../../types";

export interface HighlightStyle {
  kind: HighlightKind;
  label: string;
  color: string;
  /** Mesmo ícone usado no botão de filtro correspondente */
  icon: LucideIcon;
}

/** Em ordem de prioridade: se um posto tiver vários destaques, o primeiro define a cor do pino. */
export const HIGHLIGHTS: HighlightStyle[] = [
  { kind: "melhor-custo", label: "Melhor custo-benefício", color: "#7C3AED", icon: DollarSign },
  { kind: "mais-barato", label: "Mais barato", color: "#16A34A", icon: TrendingDown },
  { kind: "mais-perto", label: "Mais perto", color: "#0D9488", icon: Navigation2 },
];

export function stationHighlights(station: GasStation): HighlightStyle[] {
  return HIGHLIGHTS.filter((h) => station.highlights?.includes(h.kind));
}

/** Custo-benefício: preço penalizado em 10% por km. Sem distância conhecida → Infinity. */
export function costScore(s: GasStation): number {
  return s.distance === null ? Number.POSITIVE_INFINITY : s.price * (1 + s.distance * 0.1);
}

/**
 * Marca, dentro da lista recebida, os postos com melhor custo-benefício, menor preço e
 * menor distância (empates recebem o mesmo destaque).
 */
export function withHighlights(stations: GasStation[]): GasStation[] {
  const minOf = (values: number[]) => {
    const finite = values.filter((v) => Number.isFinite(v));
    return finite.length ? Math.min(...finite) : null;
  };
  const minPrice = minOf(stations.filter((s) => s.price > 0).map((s) => s.price));
  const minDistance = minOf(stations.flatMap((s) => (s.distance === null ? [] : [s.distance])));
  const minScore = minOf(stations.filter((s) => s.price > 0).map(costScore));

  return stations.map((s) => {
    const highlights: HighlightKind[] = [];
    if (minScore !== null && s.price > 0 && costScore(s) === minScore) highlights.push("melhor-custo");
    if (minPrice !== null && s.price === minPrice) highlights.push("mais-barato");
    if (minDistance !== null && s.distance === minDistance) highlights.push("mais-perto");
    return { ...s, highlights };
  });
}
