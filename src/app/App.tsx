import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import { Header } from "./components/header";
import { Footer } from "./components/footer";
import { GasStationCard } from "./components/gas-station-card";
import { SortSelector } from "./components/sort-selector";
import { StationsSkeleton } from "./components/stations-skeleton";
import { Calculators } from "./components/calculators";
import { Search, MapPin, Loader2, AlertCircle, List, Map as MapIcon } from "lucide-react";
import { COMBUSTIVEL_TIPOS, getCombustivelStations, compareByDistance } from "../services/economiza";
import { useGeolocation } from "../hooks/useGeolocation";
import { useTheme } from "../hooks/useTheme";
import type { GasStation, HighlightKind } from "../types";
import { titleCase } from "../utils/format";
import { costScore, withHighlights } from "./components/highlights";
import { FuelSelector, loadFuelType, saveFuelType } from "./components/fuel-selector";
import { WhenVisible } from "./components/when-visible";

// Leaflet e Recharts são as maiores dependências: carregados sob demanda, em pacotes separados.
const MapView = lazy(() => import("./components/map-view").then((m) => ({ default: m.MapView })));
const PriceChart = lazy(() => import("./components/price-chart").then((m) => ({ default: m.PriceChart })));

function BlockPlaceholder({ label, className }: { label: string; className: string }) {
  return (
    <div className={`${className} rounded-2xl bg-card shadow-sm flex items-center justify-center text-muted-foreground`}>
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      {label}
    </div>
  );
}

/** No celular, lista e mapa dividem o mesmo espaço; no desktop (lg) aparecem lado a lado. */
type MobileView = "lista" | "mapa";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<HighlightKind>("mais-perto");
  const [mobileView, setMobileView] = useState<MobileView>("lista");
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

    if (sortBy === "mais-barato") {
      stations.sort((a, b) => a.price - b.price);
    } else if (sortBy === "mais-perto") {
      stations.sort(compareByDistance);
    } else {
      stations.sort((a, b) => costScore(a) - costScore(b));
    }

    return withHighlights(stations);
  }, [gasStations, searchTerm, sortBy]);

  const municipio = regiao?.municipio ? titleCase(regiao.municipio) : null;
  const ondeLabel = isFallback
    ? "Perto do centro de Maceió"
    : municipio
      ? `Perto de você, em ${municipio}`
      : "Perto de você";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 w-full container mx-auto px-4 py-6 max-w-7xl">
        {geoLoading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Pedindo sua localização para mostrar os postos mais perto.</span>
          </div>
        )}

        {location && isFallback && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 dark:bg-yellow-950/40 dark:border-yellow-900 dark:text-yellow-200">
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

        {location && (
          <div className="mb-6">
            <FuelSelector value={tipoCombustivel} onChange={handleFuelChange} disabled={isLoading} />
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200">
            <p className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro ao carregar postos
            </p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {isLoading && !geoLoading && <StationsSkeleton />}

        {!isLoading && !error && gasStations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum posto com {COMBUSTIVEL_TIPOS[tipoCombustivel]} num raio de 15 km. Escolha outro combustível acima.
            </p>
          </div>
        )}

        {!isLoading && gasStations.length > 0 && location && (
          <>
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar por posto ou endereço"
                  aria-label="Buscar por posto ou endereço"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
              </div>

              <SortSelector value={sortBy} onChange={setSortBy} />
            </div>

            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-2xl" style={{ color: "var(--heading)" }}>
                {visibleStations.length} {visibleStations.length === 1 ? "posto" : "postos"}
              </h2>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden />
                {ondeLabel}
              </p>
            </div>

            <div className="mb-4 grid grid-cols-2 border-b border-border lg:hidden" role="tablist" aria-label="Ver postos como">
              {(
                [
                  { id: "lista", label: "Lista", icon: List },
                  { id: "mapa", label: "Mapa", icon: MapIcon },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const active = mobileView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`postos-${id}`}
                    onClick={() => setMobileView(id)}
                    className={`-mb-px flex items-center justify-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${
                      active ? "border-[#FF8200] text-heading" : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              <div
                id="postos-lista"
                className={`space-y-3 lg:max-h-[600px] lg:overflow-y-auto lg:pr-2 ${mobileView === "lista" ? "" : "hidden lg:block"}`}
              >
                {visibleStations.map((station) => (
                  <GasStationCard
                    key={station.id}
                    station={station}
                    isSelected={selectedStation === station.id}
                    onSelect={() => handleStationSelect(station.id)}
                  />
                ))}
                {visibleStations.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">
                    Nenhum posto encontrado para “{searchTerm.trim()}”. Tente outro nome ou bairro.
                  </p>
                )}
              </div>

              <div
                id="postos-mapa"
                className={`h-[70vh] min-h-[420px] lg:h-[600px] lg:sticky lg:top-28 ${mobileView === "mapa" ? "" : "hidden lg:block"}`}
              >
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

            <div className="mb-12">
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

      <Footer />
    </div>
  );
}
