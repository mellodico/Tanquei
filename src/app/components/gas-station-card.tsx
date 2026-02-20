import { MapPin, Navigation, TrendingDown } from "lucide-react";

interface GasStation {
  id: number;
  name: string;
  address: string;
  distance: number;
  price: number;
  fuel: string;
  position: [number, number];
  isCheapest: boolean;
}

interface GasStationCardProps {
  station: GasStation;
  isSelected: boolean;
  onSelect: () => void;
}

export function GasStationCard({ station, isSelected, onSelect }: GasStationCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        bg-white rounded-2xl p-5 cursor-pointer transition-all shadow-sm hover:shadow-md
        ${isSelected ? 'ring-2 ring-inset ring-[#FFC90E] shadow-lg' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg" style={{ color: 'var(--tanquei-purple)' }}>
              {station.name}
            </h3>
            {station.isCheapest && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-xs text-white">
                <TrendingDown className="h-3 w-3" />
                Melhor Preço
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{station.address}</span>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{station.fuel}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground">R$</span>
            <span 
              className="text-3xl"
              style={{ 
                background: 'linear-gradient(135deg, #FFC90E 0%, #FF8200 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {station.price.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">/L</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-sm text-muted-foreground">
            {station.distance.toFixed(1)} km
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-white text-sm hover:shadow-lg transition-all"
            onClick={(e) => {
              e.stopPropagation();
              // Simular navegação
              alert(`Navegando para ${station.name}`);
            }}
          >
            <Navigation className="h-4 w-4" />
            Como chegar
          </button>
        </div>
      </div>
    </div>
  );
}
