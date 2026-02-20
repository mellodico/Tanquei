import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp } from "lucide-react";

// Dados mockados de variação de preços dos últimos 30 dias
const priceData = [
  { date: "01/12", price: 5.45 },
  { date: "03/12", price: 5.42 },
  { date: "05/12", price: 5.38 },
  { date: "07/12", price: 5.40 },
  { date: "09/12", price: 5.35 },
  { date: "11/12", price: 5.29 },
  { date: "13/12", price: 5.32 },
  { date: "15/12", price: 5.28 },
  { date: "17/12", price: 5.31 },
  { date: "19/12", price: 5.29 },
  { date: "21/12", price: 5.25 },
  { date: "23/12", price: 5.29 },
  { date: "25/12", price: 5.33 },
  { date: "27/12", price: 5.30 },
  { date: "29/12", price: 5.29 },
  { date: "31/12", price: 5.27 },
  { date: "02/01", price: 5.29 },
  { date: "04/01", price: 5.32 },
  { date: "06/01", price: 5.35 },
  { date: "08/01", price: 5.38 },
  { date: "10/01", price: 5.40 },
  { date: "12/01", price: 5.42 },
  { date: "14/01", price: 5.45 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-border">
        <p className="text-sm text-muted-foreground mb-1">{payload[0].payload.date}</p>
        <p 
          className="text-xl"
          style={{
            background: 'linear-gradient(135deg, #FFC90E 0%, #FF8200 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          R$ {payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export function PriceChart() {
  const currentPrice = priceData[priceData.length - 1].price;
  const previousPrice = priceData[0].price;
  const variation = ((currentPrice - previousPrice) / previousPrice) * 100;
  const isIncreasing = variation > 0;

  return (
    <div id="graficos" className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200]">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl" style={{ color: 'var(--tanquei-purple)' }}>
            Variação de Preços - Gasolina
          </h3>
        </div>

        <div className="text-right">
          <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
          <div className="flex items-center gap-2">
            <span 
              className="text-2xl"
              style={{
                background: 'linear-gradient(135deg, #FFC90E 0%, #FF8200 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              R$ {currentPrice.toFixed(2)}
            </span>
            <span className={`text-sm ${isIncreasing ? 'text-red-500' : 'text-green-500'}`}>
              {isIncreasing ? '↑' : '↓'} {Math.abs(variation).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={priceData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFC90E" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF8200" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#717182"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#717182"
              tick={{ fontSize: 12 }}
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
              tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#FF8200" 
              strokeWidth={3}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Preço Médio</p>
          <p className="text-lg" style={{ color: 'var(--tanquei-purple)' }}>
            R$ {(priceData.reduce((sum, d) => sum + d.price, 0) / priceData.length).toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Preço Mínimo</p>
          <p className="text-lg" style={{ color: 'var(--tanquei-purple)' }}>
            R$ {Math.min(...priceData.map(d => d.price)).toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Preço Máximo</p>
          <p className="text-lg" style={{ color: 'var(--tanquei-purple)' }}>
            R$ {Math.max(...priceData.map(d => d.price)).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
