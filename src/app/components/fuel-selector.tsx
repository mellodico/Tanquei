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
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Combustível">
      <Fuel className="h-4 w-4 text-muted-foreground" aria-hidden />
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
            className={`px-3 py-1.5 rounded-full text-sm transition-all disabled:opacity-60 ${
              active
                ? "bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-white shadow-sm"
                : "bg-white border border-border hover:border-[#FF8200]"
            }`}
            style={active ? undefined : { color: "var(--tanquei-purple)" }}
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
