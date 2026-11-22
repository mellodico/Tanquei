import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "./__fixtures__/combustivel-pesquisa.json";
import {
  compareByDistance,
  uniqueStations,
  getCombustivelStations,
  mapCombustivelItem,
} from "./economiza";
import type { CombustiveisResponse, GasStation } from "../types";

const MACEIO = { latitude: -9.6498, longitude: -35.735 };
const data = fixture as CombustiveisResponse;

describe("mapCombustivelItem (resposta real da API)", () => {
  const station = mapCombustivelItem(data.conteudo[0]!, 0, MACEIO, 1);

  it("usa o preço da bomba (valorDeclarado) e guarda a última venda com desconto à parte", () => {
    expect(station.price).toBe(6.58);
    expect(station.salePrice).toBeCloseTo(5.9079, 3);
    expect(station.updatedAt).toBe("2026-11-22T13:00:50Z");
  });

  it("não marca última venda quando a diferença é só arredondamento", () => {
    const s = mapCombustivelItem(
      { produto: { venda: { valorDeclarado: 6.59, valorVenda: 6.58963 } } },
      0,
      MACEIO,
      1,
    );
    expect(s.salePrice).toBeNull();
  });

  it("sem preço da bomba, usa o valor da venda", () => {
    const s = mapCombustivelItem({ produto: { venda: { valorVenda: 6.1 } } }, 0, MACEIO, 1);
    expect(s.price).toBe(6.1);
    expect(s.salePrice).toBeNull();
    expect(s.updatedAt).toBeNull();
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

describe("uniqueStations", () => {
  const mk = (id: string, price: number) => ({ id, price }) as GasStation;

  it("deixa um posto por CNPJ, o mais barato", () => {
    const out = uniqueStations([mk("TIGRE", 9.59), mk("OUTRO", 6.5), mk("TIGRE", 6.99)]);
    expect(out.map((s) => [s.id, s.price])).toEqual([
      ["TIGRE", 6.99],
      ["OUTRO", 6.5],
    ]);
  });

  it("prefere um preço válido a preço zero", () => {
    expect(uniqueStations([mk("A", 0), mk("A", 6.1)])[0]!.price).toBe(6.1);
    expect(uniqueStations([mk("A", 6.1), mk("A", 0)])[0]!.price).toBe(6.1);
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

  it("não devolve o mesmo posto duas vezes (um item por produto na API)", async () => {
    const tigre = (descricao: string, bomba: number) => ({
      produto: { descricao, venda: { valorDeclarado: bomba, valorVenda: bomba, dataVenda: "2026-11-22T15:00:00Z" } },
      estabelecimento: { cnpj: "TIGRE", nomeFantasia: "POSTO TIGRE", endereco: { latitude: -9.66, longitude: -35.71 } },
    });
    const body = { totalRegistros: 2, conteudo: [tigre("GASOLINA C PREMIUM ADITIVADA", 9.59), tigre("GASOLINA ADITIVADA", 6.99)] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));

    const stations = await getCombustivelStations({ ...MACEIO, tipoCombustivel: 2 });
    expect(stations.map((s) => [s.id, s.price])).toEqual([["TIGRE", 6.99]]);
  });

  it("propaga erros do backend em vez de retornar lista vazia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Falha X" }), { status: 502 })),
    );
    await expect(getCombustivelStations(MACEIO)).rejects.toThrow("Falha X");
  });
});
