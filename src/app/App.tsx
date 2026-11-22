import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import { Header } from "./components/header";
import { GasStationCard } from "./components/gas-station-card";
import { Filters } from "./components/filters";
import { Calculators } from "./components/calculators";
import { Search, MapPin, Loader2, AlertCircle } from "lucide-react";
import { COMBUSTIVEL_TIPOS, getCombustivelStations, compareByDistance } from "../services/economiza";
import { useGeolocation } from "../hooks/useGeolocation";
import type { FilterType, GasStation } from "../types";
import { formatNumber } from "../utils/format";
import { costScore, withHighlights } from "./components/highlights";
import { FuelSelector, loadFuelType, saveFuelType } from "./components/fuel-selector";
import { WhenVisible } from "./components/when-visible";

// Leaflet e Recharts são as maiores dependências: carregados sob demanda, em pacotes separados.
const MapView = lazy(() => import("./components/map-view").then((m) => ({ default: m.MapView })));
const PriceChart = lazy(() => import("./components/price-chart").then((m) => ({ default: m.PriceChart })));

function BlockPlaceholder({ label, className }: { label: string; className: string }) {
  return (
    <div className={`${className} rounded-2xl bg-white shadow-sm flex items-center justify-center text-muted-foreground`}>
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      {label}
    </div>
  );
}

export default function App() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [tipoCombustivel, setTipoCombustivel] = useState(loadFuelType);
  const [result, setResult] = useState<{ key: string; stations: GasStation[]; error: string | null } | null>(
    null,
  );

  const { location, error: geoError, isFallback, isLoading: geoLoading } = useGeolocation();

  // "Carregando" é derivado: o resultado guardado ainda não corresponde à busca atual.
  const requestKey = location ? `${location.latitude}|${location.longitude}|${tipoCombustivel}` : null;
  const isLoading = requestKey === null || result?.key !== requestKey;
  const gasStations = useMemo(() => (isLoading ? [] : result!.stations), [isLoading, result]);
  const error = isLoading ? null : result!.error;

  useEffect(() => {
    if (!location || !requestKey) return;
    const controller = new AbortController();

    getCombustivelStations(
      { latitude: location.latitude, longitude: location.longitude, tipoCombustivel },
      controller.signal,
    )
      .then((stations) => setResult({ key: requestKey, stations, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Erro ao carregar postos:", err);
        setResult({
          key: requestKey,
          stations: [],
          error: err instanceof Error ? err.message : "Erro ao carregar postos",
        });
      });

    return () => controller.abort();
  }, [location, tipoCombustivel, requestKey]);

  const handleFuelChange = useCallback((tipo: number) => {
    setTipoCombustivel(tipo);
    saveFuelType(tipo);
    setSelectedStation(null);
  }, []);

  // Município do histórico de preços: o do posto mais próximo (lista já vem ordenada por distância)
  const regiao = useMemo(() => {
    const s = gasStations.find((st) => st.codigoIBGE !== undefined);
    return s ? { codigoIBGE: s.codigoIBGE!, municipio: s.municipio } : null;
  }, [gasStations]);

  const handleStationSelect = useCallback((id: string) => {
    setSelectedStation((prevId) => (prevId === id ? null : id));
  }, []);

  const visibleStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const stations = term
      ? gasStations.filter(
          (s) => s.name.toLowerCase().includes(term) || s.address.toLowerCase().includes(term),
        )
      : [...gasStations];

    if (activeFilter === "mais-barato") {
      stations.sort((a, b) => a.price - b.price);
    } else if (activeFilter === "mais-perto") {
      stations.sort(compareByDistance);
    } else if (activeFilter === "melhor-custo") {
      stations.sort((a, b) => costScore(a) - costScore(b));
    }

    return withHighlights(stations);
  }, [gasStations, searchTerm, activeFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {geoLoading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Solicitando sua localização...</span>
          </div>
        )}

        {location && isFallback && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <p className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Localização não disponível
            </p>
            <p className="text-sm mt-1">
              {geoError} Usando o centro de Maceió como referência. Permita o acesso à
              localização no navegador para resultados mais precisos.
            </p>
          </div>
        )}

        {location && !isFallback && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localização detectada: {formatNumber(location.latitude, 3)}°; {formatNumber(location.longitude, 3)}°
          </div>
        )}

        {location && (
          <div className="mb-6">
            <FuelSelector value={tipoCombustivel} onChange={handleFuelChange} disabled={isLoading} />
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro ao carregar postos
            </p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {isLoading && !geoLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Carregando postos de combustível...</span>
          </div>
        )}

        {!isLoading && !error && gasStations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum posto com {COMBUSTIVEL_TIPOS[tipoCombustivel]} encontrado num raio de 15 km.</p>
          </div>
        )}

        {!isLoading && gasStations.length > 0 && location && (
          <>
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por posto ou endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
              </div>

              <Filters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            </div>

            <div className="flex items-center gap-2 mb-6 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {isFallback ? "Mostrando postos próximos ao centro de Maceió" : "Mostrando postos próximos a você"}
              </span>
              {activeFilter && (
                <span className="text-sm px-3 py-1 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-white ml-2">
                  {activeFilter === "mais-barato" && "Ordenado por preço"}
                  {activeFilter === "mais-perto" && "Ordenado por distância"}
                  {activeFilter === "melhor-custo" && "Ordenado por custo-benefício"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <h2 className="text-xl" style={{ color: "var(--tanquei-purple)" }}>
                  Postos Próximos ({visibleStations.length})
                </h2>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {visibleStations.map((station) => (
                    <GasStationCard
                      key={station.id}
                      station={station}
                      isSelected={selectedStation === station.id}
                      onSelect={() => handleStationSelect(station.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="lg:sticky lg:top-32 h-[600px]">
                <Suspense fallback={<BlockPlaceholder label="Carregando mapa..." className="h-full" />}>
                  <MapView
                    stations={visibleStations}
                    userLocation={[location.latitude, location.longitude]}
                    isFallbackLocation={isFallback}
                    selectedStationId={selectedStation}
                    onStationSelect={handleStationSelect}
                  />
                </Suspense>
              </div>
            </div>

            <div className="mb-8">
              <Calculators />
            </div>

            {regiao && (
              <WhenVisible id="graficos" placeholder={<BlockPlaceholder label="Carregando gráfico..." className="h-[480px]" />}>
                <Suspense fallback={<BlockPlaceholder label="Carregando gráfico..." className="h-[480px]" />}>
                  <PriceChart
                    codigoIBGE={regiao.codigoIBGE}
                    municipio={regiao.municipio}
                    tipoCombustivel={tipoCombustivel}
                  />
                </Suspense>
              </WhenVisible>
            )}
          </>
        )}
      </main>
    </div>
  );
}
