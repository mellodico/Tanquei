import { useEffect, useRef } from "react";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { GasStation } from "../../types";
import { directionsUrl } from "../../utils/geo";
import { formatNumber, formatRelativeTime, isStale } from "../../utils/format";
import { HIGHLIGHTS, iconSvg, stationHighlights } from "./highlights";

interface MapViewProps {
  stations: GasStation[];
  /** Localização do usuário (real ou fallback); também é o centro inicial do mapa */
  userLocation: [number, number];
  /** true quando `userLocation` é o fallback (centro de Maceió) */
  isFallbackLocation: boolean;
  selectedStationId: string | null;
  onStationSelect: (id: string) => void;
}

const USER_ZOOM = 15;

function createUserIcon(isFallback: boolean): L.DivIcon {
  const color = isFallback ? "#9CA3AF" : "#2563EB";
  return L.divIcon({
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 0 0 6px ${color}33, 0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
    className: "user-location-marker",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

/** Escapa texto vindo da API antes de inseri-lo em HTML (popups do Leaflet). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DEFAULT_PIN = "linear-gradient(135deg, #FFC90E 0%, #FF8200 100%)";

/**
 * Pino do posto. Sem destaque: pino laranja da marca.
 * Com destaque: pino maior na cor do destaque principal, com o ícone dele no centro;
 * destaques adicionais aparecem como selos ao lado.
 */
function createIcon(station: GasStation): L.DivIcon {
  const [main, ...extra] = stationHighlights(station);
  const size = main ? 40 : 30;
  const background = main ? main.color : DEFAULT_PIN;

  const centerIcon = main
    ? `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: rotate(45deg);">
         ${iconSvg(main.icon, 18)}
       </div>`
    : "";

  const badges = extra
    .map(
      (h, i) => `
      <div title="${h.label}" style="
        position: absolute;
        top: ${-6 + i * 20}px;
        left: ${size - 6}px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${h.color};
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">${iconSvg(h.icon, 11)}</div>`,
    )
    .join("");

  return L.divIcon({
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <div style="
          position: relative;
          width: ${size}px;
          height: ${size}px;
          background: ${background};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px ${main ? `12px ${main.color}99` : "8px rgba(0,0,0,0.2)"};
        ">${centerIcon}</div>
        ${badges}
      </div>`,
    className: main ? `highlight-marker highlight-${main.kind}` : "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function highlightPills(station: GasStation): string {
  const hs = stationHighlights(station);
  if (!hs.length) return "";
  return `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;">${hs
    .map(
      (h) => `<span style="
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 8px; border-radius: 9999px;
        background: ${h.color}; color: white; font-size: 11px; font-weight: 500;
      ">${iconSvg(h.icon, 11)}${h.label}</span>`,
    )
    .join("")}</div>`;
}

function popupHtml(station: GasStation, position: [number, number]): string {
  return `
    <div style="padding: 8px; min-width: 200px;">
      ${highlightPills(station)}
      <h3 style="margin-bottom: 4px; color: #380B61; font-size: 16px; font-weight: 500;">
        ${escapeHtml(station.name)}
      </h3>
      <p style="font-size: 14px; color: #717182; margin-bottom: 8px;">
        ${escapeHtml(station.address)}
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
        ">${formatNumber(station.price)}</span>
        <span style="font-size: 12px; color: #717182;">/L</span>
      </div>
      ${
        station.updatedAt
          ? `<p style="font-size: 12px; margin: -8px 0 12px; color: ${isStale(station.updatedAt) ? "#B45309" : "#717182"};">
               Atualizado ${escapeHtml(formatRelativeTime(station.updatedAt))}
             </p>`
          : ""
      }
      <a
        href="${escapeHtml(directionsUrl(position[0], position[1]))}"
        target="_blank"
        rel="noopener noreferrer"
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
          text-decoration: none;
          font-weight: 500;
        "
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
        Como chegar
      </a>
    </div>`;
}

export function MapView({
  stations,
  userLocation,
  isFallbackLocation,
  selectedStationId,
  onStationSelect,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const initialCenter = useRef(userLocation);
  const lastIdsKey = useRef("");
  const [userLat, userLon] = userLocation;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(initialCenter.current, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = L.marker([userLat, userLon], {
      icon: createUserIcon(isFallbackLocation),
      zIndexOffset: 1000,
      keyboard: false,
    })
      .addTo(map)
      .bindPopup(
        isFallbackLocation
          ? "<strong>Centro de Maceió</strong><br/>Sua localização não está disponível"
          : "<strong>Você está aqui</strong>",
      );
  }, [userLat, userLon, isFallbackLocation]);

  const allBounds = () =>
    L.featureGroup([
      ...markersRef.current.values(),
      ...(userMarkerRef.current ? [userMarkerRef.current] : []),
    ]).getBounds();

  const recenterOnUser = () => {
    const map = mapRef.current;
    if (!map) return;
    map.closePopup();
    map.flyTo([userLat, userLon], USER_ZOOM, { duration: 1 });
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const station of stations) {
      const position = station.position;
      if (!position) continue; // sem coordenadas: aparece só na lista
      const marker = L.marker(position, {
        icon: createIcon(station),
        zIndexOffset: station.highlights?.length ? 500 : 0,
      })
        .addTo(map)
        .on("click", () => onStationSelect(station.id))
        .bindPopup(popupHtml(station, position));
      markersRef.current.set(station.id, marker);
    }

    // Enquadra os marcadores quando o conjunto de postos muda (não em simples reordenação)
    const idsKey = [...markersRef.current.keys()].sort().join("|");
    if (idsKey !== lastIdsKey.current) {
      lastIdsKey.current = idsKey;
      if (markersRef.current.size > 0) {
        map.fitBounds(allBounds(), {
          padding: [50, 50],
          maxZoom: 14,
        });
      }
    }
  }, [stations, onStationSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedStationId) {
      const marker = markersRef.current.get(selectedStationId);
      if (marker) {
        map.flyTo(marker.getLatLng(), 15, { duration: 1 });
        marker.openPopup();
      }
    } else {
      map.closePopup();
      if (markersRef.current.size > 0) {
        map.flyToBounds(allBounds(), {
          padding: [50, 50],
          duration: 1,
          maxZoom: 13,
        });
      }
    }
  }, [selectedStationId]);

  return (
    // `isolate` mantém os z-index do Leaflet dentro deste bloco (não sobrepõe o header)
    <div className="relative isolate w-full h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-2xl overflow-hidden shadow-md"
        style={{ minHeight: "600px" }}
      />
      <div
        className="absolute bottom-6 left-4 z-[1000] rounded-xl bg-white/95 px-3 py-2 text-xs shadow-md space-y-1"
        aria-label="Legenda do mapa"
      >
        {HIGHLIGHTS.map(({ kind, label, color, icon: Icon }) => (
          <div key={kind} className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: color }}
            >
              <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
            </span>
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 rounded-full bg-gradient-to-br from-[#FFC90E] to-[#FF8200]" />
          <span>Outros postos</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center">
            <span
              className="h-3 w-3 rounded-full border-2 border-white shadow"
              style={{ background: isFallbackLocation ? "#9CA3AF" : "#2563EB" }}
            />
          </span>
          <span>{isFallbackLocation ? "Centro de Maceió" : "Você"}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={recenterOnUser}
        title={isFallbackLocation ? "Centralizar no centro de Maceió" : "Centralizar na minha localização"}
        aria-label={isFallbackLocation ? "Centralizar no centro de Maceió" : "Centralizar na minha localização"}
        className="absolute bottom-6 right-4 z-[1000] flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
        style={{ color: "var(--tanquei-purple)" }}
      >
        <LocateFixed className="h-4 w-4" />
        {isFallbackLocation ? "Centro de Maceió" : "Minha localização"}
      </button>
    </div>
  );
}
