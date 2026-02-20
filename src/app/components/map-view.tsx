import { useEffect, useRef } from "react";
import L from "leaflet";
import { Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

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

interface MapViewProps {
  stations: GasStation[];
  selectedStationId: number | null;
  onStationSelect: (id: number) => void;
}

export function MapView({ stations, selectedStationId, onStationSelect }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centro padrão (média das posições)
    const center: [number, number] = stations.length > 0
      ? [
          stations.reduce((sum, s) => sum + s.position[0], 0) / stations.length,
          stations.reduce((sum, s) => sum + s.position[1], 0) / stations.length,
        ]
      : [-23.561, -46.656];

    // Inicializar o mapa
    const map = L.map(mapContainerRef.current).setView(center, 13);

    // Adicionar camada de tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Limpar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Criar ícones personalizados
    const createCustomIcon = (isCheapest: boolean) => {
      const pulseAnimation = isCheapest ? 'animation: pulse 2s infinite;' : '';
      
      return L.divIcon({
        html: `
          <div style="position: relative;">
            <div style="
              width: 32px;
              height: 32px;
              background: linear-gradient(135deg, #FFC90E 0%, #FF8200 100%);
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px ${isCheapest ? '12px rgba(255, 201, 14, 0.6)' : '8px rgba(0,0,0,0.2)'};
              ${pulseAnimation}
            "></div>
            ${isCheapest ? `
              <style>
                @keyframes pulse {
                  0%, 100% {
                    transform: rotate(-45deg) scale(1);
                    box-shadow: 0 4px 12px rgba(255, 201, 14, 0.6);
                  }
                  50% {
                    transform: rotate(-45deg) scale(1.1);
                    box-shadow: 0 6px 16px rgba(255, 201, 14, 0.8);
                  }
                }
              </style>
            ` : ''}
          </div>
        `,
        className: isCheapest ? 'cheapest-marker' : 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });
    };

    // Adicionar marcadores
    stations.forEach((station) => {
      const icon = createCustomIcon(station.isCheapest);
      
      const marker = L.marker(station.position, { icon })
        .addTo(mapRef.current!)
        .on('click', () => {
          onStationSelect(station.id);
        });

      // Criar popup personalizado
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin-bottom: 4px; color: #380B61; font-size: 16px; font-weight: 500;">
            ${station.name}
          </h3>
          <p style="font-size: 14px; color: #717182; margin-bottom: 8px;">
            ${station.address}
          </p>
          <div style="display: flex; align-items: baseline; gap: 4px; margin-bottom: 12px;">
            <span style="font-size: 12px; color: #717182;">R$</span>
            <span style="
              font-size: 24px;
              background: linear-gradient(135deg, #FFC90E 0%, #FF8200 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              font-weight: 600;
            ">
              ${station.price.toFixed(2)}
            </span>
            <span style="font-size: 12px; color: #717182;">/L</span>
          </div>
          <button 
            onclick="alert('Navegando para ${station.name.replace(/'/g, "\\'")}'); return false;"
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              padding: 8px 12px;
              border-radius: 9999px;
              background: linear-gradient(135deg, #FFC90E 0%, #FF8200 100%);
              color: white;
              font-size: 14px;
              border: none;
              cursor: pointer;
              width: 100%;
              font-weight: 500;
            "
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
            Como chegar
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });
  }, [stations, onStationSelect]);

  // Centralizar no marcador selecionado
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedStationId) {
      // --- Cenario A: Um posto foi selecionado ---
      const selectedStation = stations.find(s => s.id === selectedStationId);
      if (selectedStation) {
        // Voa para o posto
        mapRef.current.flyTo(selectedStation.position, 15, {
          duration: 1,
        });

        // Abre o popup
        const markerIndex = stations.findIndex(s => s.id === selectedStationId);
        if (markersRef.current[markerIndex]) {
          markersRef.current[markerIndex].openPopup();
        }
      }
    } else {
      // --- Cenario B: Nenhum posto selecionado (Deseleção) ---
      
      // Fecha qualquer popup aberto
      mapRef.current.closePopup();

      // Reseta o zoom para mostrar todos os marcadores (FitBounds)
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        mapRef.current.flyToBounds(group.getBounds(), {
          padding: [50, 50], // Margem de segurança
          duration: 1,
          maxZoom: 13
        });
      }
    }
  }, [selectedStationId, stations]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-2xl overflow-hidden shadow-md"
      style={{ minHeight: '600px' }}
    />
  );
}
