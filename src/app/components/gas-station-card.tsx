import { MapPin, Navigation } from "lucide-react";
import { stationHighlights } from "./highlights";
import type { GasStation } from "../../types";
import { directionsUrl } from "../../utils/geo";
import { formatNumber } from "../../utils/format";

interface GasStationCardProps {
  station: GasStation;
  isSelected: boolean;
  onSelect: () => void;
}

export function GasStationCard({ station, isSelected, onSelect }: GasStationCardProps) {
  const highlights = stationHighlights(station);
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
          </div>
          {highlights.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-1">
              {highlights.map(({ kind, label, color, icon: Icon }) => (
                <span
                  key={kind}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
                  style={{ background: color }}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </span>
              ))}
            </div>
          )}
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
              {formatNumber(station.price)}
            </span>
            <span className="text-xs text-muted-foreground">/L</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-sm text-muted-foreground">
            {station.distance !== null ? `${formatNumber(station.distance, 1)} km` : "Distância indisponível"}
          </div>
          {station.position && (
            <a
              href={directionsUrl(station.position[0], station.position[1])}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-white text-sm hover:shadow-lg transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <Navigation className="h-4 w-4" />
              Como chegar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
