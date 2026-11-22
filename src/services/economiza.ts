import type {
  BuscaCombustivelParams,
  CombustiveisResponse,
  CombustivelItem,
  GasStation,
  HistoricoResposta,
} from "../types";
import { calculateDistance } from "../utils/geo";

// Caminho relativo: em dev o Vite faz proxy de /api para o backend (vite.config.ts).
// Em produção, defina VITE_API_BASE se o backend estiver em outro domínio.
const API_BASE = `${import.meta.env.VITE_API_BASE ?? ""}/api/economiza`;

export const COMBUSTIVEL_TIPOS: Record<number, string> = {
  1: "Gasolina Comum",
  2: "Gasolina Aditivada",
  3: "Etanol",
  4: "Diesel Comum",
  5: "Diesel S10",
  6: "GNV",
};

function formatAddress(e: NonNullable<CombustivelItem["estabelecimento"]>["endereco"]): string {
  if (!e) return "Endereço não disponível";
  const rua = [e.nomeLogradouro, e.numeroImovel].filter(Boolean).join(", ");
  const local = [e.bairro, e.municipio].filter(Boolean).join(" - ");
  return [rua, local].filter(Boolean).join(" - ") || "Endereço não disponível";
}

function positive(v: unknown): number | null {
  return typeof v === "number" && v > 0 ? v : null;
}

export function mapCombustivelItem(
  item: CombustivelItem,
  index: number,
  user: { latitude: number; longitude: number } | null,
  tipoCombustivel: number,
): GasStation {
  const est = item.estabelecimento;
  const lat = est?.endereco?.latitude;
  const lon = est?.endereco?.longitude;
  const hasCoords = typeof lat === "number" && typeof lon === "number";
  const bomba = positive(item.produto?.venda?.valorDeclarado);
  const venda = positive(item.produto?.venda?.valorVenda);

  return {
    id: est?.cnpj ?? `sem-cnpj-${index}`,
    name: est?.nomeFantasia || est?.razaoSocial || "Sem nome",
    address: formatAddress(est?.endereco),
    distance:
      hasCoords && user
        ? calculateDistance(user.latitude, user.longitude, lat, lon)
        : null,
    price: bomba ?? venda ?? 0,
    salePrice: bomba !== null && venda !== null && venda < bomba - 0.005 ? venda : null,
    updatedAt: item.produto?.venda?.dataVenda ?? null,
    fuel: COMBUSTIVEL_TIPOS[tipoCombustivel] ?? item.produto?.descricao ?? "Combustível",
    position: hasCoords ? [lat, lon] : null,
    razaoSocial: est?.razaoSocial,
    cnpj: est?.cnpj,
    codigoIBGE: est?.endereco?.codigoIBGE,
    municipio: est?.endereco?.municipio,
  };
}

/**
 * A API devolve um item por produto, então um posto pode aparecer mais de uma vez no mesmo
 * tipo (ex.: "Gasolina Aditivada" e "Gasolina Premium Aditivada"). Fica o mais barato.
 */
export function uniqueStations(stations: GasStation[]): GasStation[] {
  const byId = new Map<string, GasStation>();
  for (const s of stations) {
    const prev = byId.get(s.id);
    if (!prev || (s.price > 0 && (prev.price <= 0 || s.price < prev.price))) byId.set(s.id, s);
  }
  return [...byId.values()];
}

/** Ordena por distância; postos sem distância vão para o fim. */
export function compareByDistance(a: GasStation, b: GasStation): number {
  if (a.distance === null) return b.distance === null ? 0 : 1;
  if (b.distance === null) return -1;
  return a.distance - b.distance;
}

async function httpError(response: Response, prefix: string): Promise<Error> {
  let message = `${prefix} (HTTP ${response.status})`;
  try {
    const body = await response.json();
    if (body?.error) message = body.error;
  } catch {
    // corpo não-JSON: mantém a mensagem padrão
  }
  return new Error(message);
}

/** Lança erro em caso de falha; o chamador decide como exibir. */
export async function getCombustivelStations(
  params: BuscaCombustivelParams,
  signal?: AbortSignal,
): Promise<GasStation[]> {
  const tipoCombustivel = params.tipoCombustivel ?? 1;

  const response = await fetch(`${API_BASE}/combustiveis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, tipoCombustivel }),
    signal,
  });

  if (!response.ok) throw await httpError(response, "Erro ao buscar postos");

  const data: CombustiveisResponse = await response.json();
  const user = { latitude: params.latitude, longitude: params.longitude };

  return uniqueStations(
    (data.conteudo ?? []).map((item, i) => mapCombustivelItem(item, i, user, tipoCombustivel)),
  ).sort(compareByDistance);
}

export async function getHistoricoPrecos(
  params: { codigoIBGE: number; tipoCombustivel?: number; dias?: number },
  signal?: AbortSignal,
): Promise<HistoricoResposta> {
  const qs = new URLSearchParams({
    codigoIBGE: String(params.codigoIBGE),
    tipoCombustivel: String(params.tipoCombustivel ?? 1),
    dias: String(params.dias ?? 30),
  });
  const response = await fetch(`${API_BASE}/historico?${qs}`, { signal });
  if (!response.ok) throw await httpError(response, "Erro ao buscar histórico de preços");
  return response.json();
}
