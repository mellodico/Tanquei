import type { HighlightKind } from "../../types";
import { HIGHLIGHTS } from "./highlights";

const LABELS: Record<HighlightKind, string> = {
  "mais-perto": "Distância",
  "mais-barato": "Preço",
  "melhor-custo": "Custo-benefício",
};

/** Mesma ordem de leitura do card: primeiro o que está perto, depois preço e a combinação dos dois. */
const ORDER: HighlightKind[] = ["mais-perto", "mais-barato", "melhor-custo"];

interface SortSelectorProps {
  value: HighlightKind;
  onChange: (sort: HighlightKind) => void;
}

export function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span id="ordenar-por" className="text-sm text-muted-foreground">
        Ordenar por
      </span>
      <div
        role="radiogroup"
        aria-labelledby="ordenar-por"
        className="flex rounded-full border border-border bg-card p-1"
      >
        {ORDER.map((kind) => {
          const Icon = HIGHLIGHTS.find((h) => h.kind === kind)!.icon;
          const active = kind === value;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(kind)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-none ${
                active ? "bg-heading text-card" : "text-heading hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {LABELS[kind]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
