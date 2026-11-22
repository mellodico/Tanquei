import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "./__fixtures__/combustivel-pesquisa.json";
import {
  compareByDistance,
  getCombustivelStations,
  mapCombustivelItem,
} from "./economiza";
import type { CombustiveisResponse, GasStation } from "../types";

const MACEIO = { latitude: -9.6498, longitude: -35.735 };
const data = fixture as CombustiveisResponse;

describe("mapCombustivelItem (resposta real da API)", () => {
  const station = mapCombustivelItem(data.conteudo[0]!, 0, MACEIO, 1);

  it("lê preço de produto.venda.valorVenda", () => {
    expect(station.price).toBeCloseTo(5.9079, 3);
  });

  it("monta o endereço a partir do objeto endereco", () => {
    expect(station.address).toBe("AV GOVERNADOR LAMENHA FILHO, 1880 - FEITOSA - MACEIO");
    expect(station.address).not.toContain("[object Object]");
  });

  it("usa coordenadas de estabelecimento.endereco e calcula distância", () => {
    expect(station.position).toEqual([-9.630064299999999, -35.7248617]);
    expect(station.distance).toBeGreaterThan(2);
    expect(station.distance).toBeLessThan(3);
  });

  it("usa CNPJ como id e nome fantasia como nome", () => {
    expect(station.id).toBe("20528778000185");
    expect(station.name).toBe("AUTO POSTO NICAULA");
    expect(station.fuel).toBe("Gasolina Comum");
  });

  it("sem coordenadas: position e distance ficam null (sem posição inventada)", () => {
    const s = mapCombustivelItem({ estabelecimento: { cnpj: "1", endereco: {} } }, 0, MACEIO, 1);
    expect(s.position).toBeNull();
    expect(s.distance).toBeNull();
  });
});

describe("compareByDistance", () => {
  it("coloca postos sem distância no fim", () => {
    const mk = (id: string, distance: number | null) => ({ id, distance }) as GasStation;
    const sorted = [mk("a", null), mk("b", 3), mk("c", 1)].sort(compareByDistance);
    expect(sorted.map((s) => s.id)).toEqual(["c", "b", "a"]);
  });
});

describe("getCombustivelStations", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia parâmetros simples ao backend e ordena por distância", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const stations = await getCombustivelStations(MACEIO);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/economiza/combustiveis",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ ...MACEIO, tipoCombustivel: 1 });
    expect(stations).toHaveLength(2);
    expect(stations[0]!.distance!).toBeLessThanOrEqual(stations[1]!.distance!);
  });

  it("propaga erros do backend em vez de retornar lista vazia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Falha X" }), { status: 502 })),
    );
    await expect(getCombustivelStations(MACEIO)).rejects.toThrow("Falha X");
  });
});
