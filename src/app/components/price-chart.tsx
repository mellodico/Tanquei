import { useEffect, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { formatNumber } from "../../utils/format";
import { COMBUSTIVEL_TIPOS, getHistoricoPrecos } from "../../services/economiza";
import type { HistoricoResposta, PontoDiario } from "../../types";

interface PriceChartProps {
  /** Município cujo histórico será exibido (do posto mais próximo do usuário) */
  codigoIBGE: number;
  /** Nome do município, usado enquanto o histórico não carrega */
  municipio?: string;
  tipoCombustivel?: number;
}

const PERIODOS = [7, 30, 90] as const;

/** AAAA-MM-DD → DD/MM */
function diaMes(data: string): string {
  const [, m, d] = data.split("-");
  return `${d}/${m}`;
}

/** AAAA-MM-DD → DD/MM/AAAA */
function dataCompleta(data: string): string {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

const gradientText = {
  background: "linear-gradient(135deg, #FFC90E 0%, #FF8200 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
} as const;

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: PontoDiario }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!.payload;
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-border text-sm">
      <p className="text-muted-foreground mb-1">{dataCompleta(p.data)}</p>
      <p className="text-xl" style={gradientText}>
        R$ {formatNumber(p.media)} <span className="text-xs">média</span>
      </p>
      <p className="text-muted-foreground">
        Mín. R$ {formatNumber(p.minimo)} · Máx. R$ {formatNumber(p.maximo)}
      </p>
      <p className="text-muted-foreground">{p.postos} postos</p>
    </div>
  );
}

export function PriceChart({ codigoIBGE, municipio, tipoCombustivel = 1 }: PriceChartProps) {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [historico, setHistorico] = useState<HistoricoResposta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    getHistoricoPrecos({ codigoIBGE, tipoCombustivel, dias }, controller.signal)
      .then(setHistorico)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setHistorico(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar histórico");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [codigoIBGE, tipoCombustivel, dias]);

  const serie = historico?.serie ?? [];
  const ultimo = serie[serie.length - 1];
  const primeiro = serie[0];
  const variacao =
    ultimo && primeiro && serie.length >= 2 ? ((ultimo.media - primeiro.media) / primeiro.media) * 100 : null;
  const nomeMunicipio = titleCase(historico?.municipio ?? municipio ?? "sua região");
  const combustivel = COMBUSTIVEL_TIPOS[tipoCombustivel] ?? "Combustível";

  return (
    <div id="graficos" className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-gradient-to-r from-[#FFC90E] to-[#FF8200]">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl" style={{ color: "var(--tanquei-purple)" }}>
              Variação de Preços - {combustivel}
            </h3>
            <p className="text-sm text-muted-foreground">
              {nomeMunicipio} · média diária dos preços de venda (SEFAZ-AL)
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex justify-end gap-1 mb-1" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDias(p)}
                aria-pressed={dias === p}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  dias === p
                    ? "bg-gradient-to-r from-[#FFC90E] to-[#FF8200] text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent/20"
                }`}
              >
                {p} dias
              </button>
            ))}
          </div>
          {ultimo && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-2xl" style={gradientText}>
                R$ {formatNumber(ultimo.media)}
              </span>
              {variacao !== null && (
                <span
                  className={`text-sm ${
                    variacao > 0 ? "text-red-500" : variacao < 0 ? "text-green-600" : "text-muted-foreground"
                  }`}
                  title={`Desde ${dataCompleta(primeiro!.data)}`}
                >
                  {variacao > 0 ? "↑" : variacao < 0 ? "↓" : "="} {formatNumber(Math.abs(variacao), 1)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando histórico...
        </div>
      ) : error ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-red-700 gap-2">
          <AlertCircle className="h-6 w-6" />
          <p className="text-sm">{error}</p>
        </div>
      ) : serie.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-center text-muted-foreground px-6">
          Ainda não há histórico para {nomeMunicipio}. A API da SEFAZ informa só o preço atual de cada posto;
          o Tanquei registra esses preços todos os dias para montar a série.
        </div>
      ) : (
        <>
          {serie.length < 7 && (
            <p className="mb-3 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              Histórico em formação: a API da SEFAZ informa só o preço atual de cada posto, então o Tanquei
              registra os preços diariamente
              {historico?.desde ? ` desde ${dataCompleta(historico.desde)}` : ""}. O gráfico fica mais completo
              a cada dia.
            </p>
          )}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFC90E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF8200" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="data" tickFormatter={diaMes} stroke="#717182" tick={{ fontSize: 12 }} />
                <YAxis
                  stroke="#717182"
                  tick={{ fontSize: 12 }}
                  width={70}
                  domain={[(min: number) => Math.max(0, min - 0.1), (max: number) => max + 0.1]}
                  tickFormatter={(value: number) => `R$ ${formatNumber(value)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="maximo"
                  name="Máximo"
                  stroke="#9CA3AF"
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="minimo"
                  name="Mínimo"
                  stroke="#9CA3AF"
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="media"
                  name="Média"
                  stroke="#FF8200"
                  strokeWidth={3}
                  fill="url(#colorPrice)"
                  dot={serie.length < 7 ? { r: 4, fill: "#FF8200" } : false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Linha laranja: preço médio · linhas tracejadas: menor e maior preço do dia
          </p>
        </>
      )}

      {ultimo && !isLoading && !error && (
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Preço Médio</p>
            <p className="text-lg" style={{ color: "var(--tanquei-purple)" }}>
              R$ {formatNumber(ultimo.media)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Preço Mínimo</p>
            <p className="text-lg" style={{ color: "var(--tanquei-purple)" }}>
              R$ {formatNumber(ultimo.minimo)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Preço Máximo</p>
            <p className="text-lg" style={{ color: "var(--tanquei-purple)" }}>
              R$ {formatNumber(ultimo.maximo)}
            </p>
          </div>
          <p className="col-span-3 text-center text-xs text-muted-foreground">
            Em {dataCompleta(ultimo.data)}, entre {ultimo.postos} postos de {nomeMunicipio}
          </p>
        </div>
      )}
    </div>
  );
}
