import { useState, useMemo } from "react";
import { Header } from "./components/header";
import { GasStationCard } from "./components/gas-station-card";
import { MapView } from "./components/map-view";
import { Filters, FilterType } from "./components/filters";
import { Calculators } from "./components/calculators";
import { PriceChart } from "./components/price-chart";
import { Search, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Mock data para postos de combustível
const mockGasStations = [
  {
    id: 1,
    name: "Posto Shell Centro",
    address: "Av. Paulista, 1000 - São Paulo, SP",
    distance: 0.5,
    price: 5.29,
    fuel: "Gasolina",
    position: [-23.561, -46.656] as [number, number],
    isCheapest: true,
  },
  {
    id: 2,
    name: "Ipiranga Express",
    address: "Rua Augusta, 2500 - São Paulo, SP",
    distance: 1.2,
    price: 5.45,
    fuel: "Gasolina",
    position: [-23.563, -46.654] as [number, number],
    isCheapest: false,
  },
  {
    id: 3,
    name: "BR Mania",
    address: "Av. Rebouças, 800 - São Paulo, SP",
    distance: 2.1,
    price: 5.39,
    fuel: "Gasolina",
    position: [-23.559, -46.658] as [number, number],
    isCheapest: false,
  },
  {
    id: 4,
    name: "Petrobras Vila",
    address: "Rua Consolação, 3000 - São Paulo, SP",
    distance: 2.8,
    price: 5.52,
    fuel: "Gasolina",
    position: [-23.565, -46.66] as [number, number],
    isCheapest: false,
  },
  {
    id: 5,
    name: "Posto Ale",
    address: "Av. Brigadeiro Luís Antônio, 500 - São Paulo, SP",
    distance: 0.8,
    price: 5.35,
    fuel: "Gasolina",
    position: [-23.56, -46.655] as [number, number],
    isCheapest: false,
  },
];

export default function App() {
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);

  // Função de Toggle
  const handleStationSelect = (id: number) => {
    setSelectedStation((prevId) => {
      // Se o ID clicado (id) for igual ao anterior (prevId), desmarca (null)
      // Caso contrário, marca o novo ID
      return prevId === id ? null : id;
    });
  };

  // Aplicar filtros e busca
  const filteredAndSortedStations = useMemo(() => {
    let stations = [...mockGasStations];

    // Aplicar busca
    if (searchTerm) {
      stations = stations.filter(
        (station) =>
          station.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          station.address
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Aplicar filtros
    if (activeFilter === "mais-barato") {
      stations.sort((a, b) => a.price - b.price);
    } else if (activeFilter === "mais-perto") {
      stations.sort((a, b) => a.distance - b.distance);
    } else if (activeFilter === "melhor-custo") {
      // Fórmula de custo-benefício: considera preço e distância
      stations.sort((a, b) => {
        const scoreA = a.price * (1 + a.distance * 0.1);
        const scoreB = b.price * (1 + b.distance * 0.1);
        return scoreA - scoreB;
      });
    }

    return stations;
  }, [searchTerm, activeFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Search Bar and Filters */}
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

          <Filters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>

        {/* Location Info */}
        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Mostrando postos próximos a você</span>
          {activeFilter && (
            <span className="text-sm px-3 py-1 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-white ml-2">
              {activeFilter === "mais-barato" &&
                "Ordenado por preço"}
              {activeFilter === "mais-perto" &&
                "Ordenado por distância"}
              {activeFilter === "melhor-custo" &&
                "Ordenado por custo-benefício"}
            </span>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gas Stations List */}
          <div className="space-y-4">
            <h2
              className="text-xl"
              style={{ color: "var(--tanquei-purple)" }}
            >
              Postos Próximos ({filteredAndSortedStations.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredAndSortedStations.map((station, index) => (
                  <GasStationCard
                    key={station.id}
                    station={{
                      ...station,
                      isCheapest:
                        activeFilter === "mais-barato" &&
                        index === 0,
                    }}
                    isSelected={selectedStation === station.id}
                    onSelect={() =>
                      handleStationSelect(station.id)
                    }
                  />
                ),
              )}
            </div>
          </div>

          {/* Map */}
          <div className="lg:sticky lg:top-32 h-[600px]">
            <MapView
              stations={filteredAndSortedStations.map(
                (station, index) => ({
                  ...station,
                  isCheapest:
                    activeFilter === "mais-barato" &&
                    index === 0,
                }),
              )}
              selectedStationId={selectedStation}
              onStationSelect={handleStationSelect}
            />
          </div>
        </div>

        {/* Calculators Section */}
        <div className="mb-8">
          <Calculators />
        </div>

        {/* Price Chart Section */}
        <div>
          <PriceChart />
        </div>
      </main>
    </div>
  );
}