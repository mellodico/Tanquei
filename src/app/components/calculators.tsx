import { useState } from "react";
import { Car, Route } from "lucide-react";
import { formatNumber } from "../../utils/format";

export function Calculators() {
  const [tankSize, setTankSize] = useState("");
  const [currentFuel, setCurrentFuel] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [distance, setDistance] = useState("");
  const [consumption, setConsumption] = useState("");

  const calculateFillTank = () => {
    const size = parseFloat(tankSize);
    const current = parseFloat(currentFuel);
    const price = parseFloat(fuelPrice);

    if (isNaN(size) || isNaN(current) || isNaN(price)) return null;

    const litersNeeded = size - current;
    const totalCost = litersNeeded * price;

    return {
      litersNeeded: formatNumber(litersNeeded),
      totalCost: formatNumber(totalCost),
    };
  };

  const calculateTripCost = () => {
    const dist = parseFloat(distance);
    const cons = parseFloat(consumption);
    const price = parseFloat(fuelPrice);

    if (isNaN(dist) || isNaN(cons) || isNaN(price) || cons <= 0) return null;

    const litersNeeded = dist / cons;
    const totalCost = litersNeeded * price;

    return {
      litersNeeded: formatNumber(litersNeeded),
      totalCost: formatNumber(totalCost),
    };
  };

  const tankResult = calculateFillTank();
  const tripResult = calculateTripCost();

  return (
    <div id="calculadoras" className="space-y-6">
      <h2 className="text-2xl" style={{ color: 'var(--heading)' }}>
        Calculadoras
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200]">
              <Car className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg" style={{ color: 'var(--heading)' }}>
              Encher o Tanque
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Capacidade do tanque (L)
              </label>
              <input
                type="number"
                value={tankSize}
                onChange={(e) => setTankSize(e.target.value)}
                placeholder="Ex: 50"
                className="w-full px-4 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#FFC90E]"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Combustível atual (L)
              </label>
              <input
                type="number"
                value={currentFuel}
                onChange={(e) => setCurrentFuel(e.target.value)}
                placeholder="Ex: 10"
                className="w-full px-4 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#FFC90E]"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Preço por litro (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                placeholder="Ex: 5.29"
                className="w-full px-4 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#FFC90E]"
              />
            </div>

            {tankResult && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#FFC90E]/10 to-[#FF8200]/10 border border-[#FFC90E]/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Litros necessários:</span>
                  <span className="font-medium">{tankResult.litersNeeded} L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor total:</span>
                  <span
                    className="font-display text-2xl font-bold tabular-nums"
                    style={{
                      background: 'linear-gradient(135deg, #FFC90E 0%, #FF8200 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    R$ {tankResult.totalCost}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200]">
              <Route className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg" style={{ color: 'var(--heading)' }}>
              Custo da Viagem
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Distância (km)
              </label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="Ex: 150"
                className="w-full px-4 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#FFC90E]"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Consumo médio (km/L)
              </label>
              <input
                type="number"
                step="0.1"
                value={consumption}
                onChange={(e) => setConsumption(e.target.value)}
                placeholder="Ex: 12.5"
                className="w-full px-4 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#FFC90E]"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Preço por litro (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                placeholder="Ex: 5.29"
                className="w-full px-4 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#FFC90E]"
              />
            </div>

            {tripResult && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#FFC90E]/10 to-[#FF8200]/10 border border-[#FFC90E]/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Combustível necessário:</span>
                  <span className="font-medium">{tripResult.litersNeeded} L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Custo estimado:</span>
                  <span
                    className="font-display text-2xl font-bold tabular-nums"
                    style={{
                      background: 'linear-gradient(135deg, #FFC90E 0%, #FF8200 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    R$ {tripResult.totalCost}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
