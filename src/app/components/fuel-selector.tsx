import { Fuel } from "lucide-react";
import { COMBUSTIVEL_TIPOS } from "../../services/economiza";

interface FuelSelectorProps {
  value: number;
  onChange: (tipo: number) => void;
  disabled?: boolean;
}

const TIPOS = Object.entries(COMBUSTIVEL_TIPOS).map(([tipo, label]) => ({ tipo: Number(tipo), label }));

export function FuelSelector({ value, onChange, disabled }: FuelSelectorProps) {
  return (
    // No celular, uma faixa com rolagem horizontal (encostada nas bordas); a partir de sm, quebra em linhas
    <div
      className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="radiogroup"
      aria-label="Combustível"
    >
      <Fuel className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      {TIPOS.map(({ tipo, label }) => {
        const active = tipo === value;
        return (
          <button
            key={tipo}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(tipo)}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition-all disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active
                ? "bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-white shadow-sm"
                : "bg-card border border-border hover:border-[#FF8200]"
            }`}
            style={active ? undefined : { color: "var(--heading)" }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const STORAGE_KEY = "tanquei:tipoCombustivel";

export function loadFuelType(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    return v in COMBUSTIVEL_TIPOS ? v : 1;
  } catch {
    return 1;
  }
}

export function saveFuelType(tipo: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(tipo));
  } catch {
    // Armazenamento indisponível (modo privado etc.): a escolha só não é lembrada
  }
}
