import { DollarSign, TrendingDown, Navigation2 } from "lucide-react";

export type FilterType = "melhor-custo" | "mais-barato" | "mais-perto" | null;

interface FiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function Filters({ activeFilter, onFilterChange }: FiltersProps) {
  const filters = [
    {
      id: "melhor-custo" as FilterType,
      label: "Melhor Custo Benefício",
      icon: DollarSign,
    },
    {
      id: "mais-barato" as FilterType,
      label: "Mais Barato",
      icon: TrendingDown,
    },
    {
      id: "mais-perto" as FilterType,
      label: "Mais Perto",
      icon: Navigation2,
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        
        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(isActive ? null : filter.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full transition-all
              ${isActive 
                ? 'bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-white shadow-md' 
                : 'bg-white text-[#380B61] border border-border hover:border-[#FFC90E]'
              }
            `}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
}
