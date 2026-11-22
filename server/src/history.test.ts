import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { runner } from "node-pg-migrate";
import { createPool } from "./db/pool";
import { MIGRATIONS_DIR, MIGRATIONS_TABLE, assertMigrated, migrationNames } from "./db/migrations";
import { HistoryStore, dataLocal, toRows } from "./history";

const MACEIO = 2704302;
const ARAPIRACA = 2700300;

function item(cnpj: string, preco: number, dataVenda: string, ibge = MACEIO, municipio: string | undefined = "MACEIO") {
  return {
    produto: { venda: { valorVenda: preco, dataVenda } },
    estabelecimento: { cnpj, nomeFantasia: `POSTO ${cnpj}`, endereco: { codigoIBGE: ibge, municipio } },
  };
}

/** ISO de N dias atrás, às 12:00 em Alagoas (+ minutos opcionais) */
function hojeMenos(dias: number, minutos = 0): string {
  const dia = dataLocal(new Date(Date.now() - dias * 86_400_000));
  const meioDia = new Date(`${dia}T12:00:00-03:00`).getTime();
  return new Date(meioDia + minutos * 60_000).toISOString();
}

describe("dataLocal", () => {
  it("usa o fuso de Alagoas (UTC-3)", () => {
    expect(dataLocal("2026-11-22T02:00:00Z")).toBe("2026-11-21");
    expect(dataLocal("2026-11-22T03:00:00Z")).toBe("2026-11-22");
    expect(dataLocal("invalida")).toBeNull();
  });
});

describe("toRows", () => {
  it("converte itens válidos e ignora incompletos ou com preço zero", () => {
    const rows = toRows([
      item("A", 6.123456, "2026-11-22T15:00:00Z"),
      item("B", 0, "2026-11-22T15:00:00Z"),
      { produto: { venda: { valorVenda: 6 } }, estabelecimento: { cnpj: "C" } },
      item("D", 6, "data-invalida"),
    ]);
    expect(rows).toEqual([
      expect.objectContaining({ cnpj: "A", data: "2026-11-22", preco: 6.1235, codigoIBGE: MACEIO, municipio: "MACEIO" }),
    ]);
  });

  it("mantém a venda mais recente quando o posto se repete no dia", () => {
    const rows = toRows([
      item("A", 6.5, "2026-11-22T18:00:00Z"),
      item("A", 6.0, "2026-11-22T13:00:00Z"),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.preco).toBe(6.5);
  });
});

// Integração com Postgres real. Rode com: npm run test:db
// ATENÇÃO: os testes apagam as tabelas. Nunca aponte para o banco de produção.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// Primeiras consultas numa branch recém-criada podem levar alguns segundos
describe.skipIf(!TEST_DATABASE_URL)("HistoryStore (Postgres)", { timeout: 30_000 }, () => {
  let pool: Pool;
  let store: HistoryStore;

  const migrate = (direction: "up" | "down", count = Infinity) =>
    runner({
      databaseUrl: TEST_DATABASE_URL!,
      dir: MIGRATIONS_DIR,
      migrationsTable: MIGRATIONS_TABLE,
      direction,
      count,
      checkOrder: true,
      log: () => undefined,
    });

  beforeAll(async () => {
    pool = createPool(TEST_DATABASE_URL!);
    store = new HistoryStore(pool);
    // Ida e volta: valida também as seções "Down" das migrations
    await migrate("up");
    await migrate("down");
    await expect(assertMigrated(pool)).rejects.toThrow(/Migrations pendentes/);
    await migrate("up");
    await assertMigrated(pool);
  }, 120_000);

  beforeEach(async () => {
    await pool.query("TRUNCATE precos_diarios, postos, municipios");
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("agrega média/mínimo/máximo por dia e mantém o último preço de cada posto", async () => {
    await store.record(1, [item("A", 6.0, hojeMenos(1)), item("B", 5.0, hojeMenos(1))]);
    await store.record(1, [item("A", 6.2, hojeMenos(0)), item("B", 5.8, hojeMenos(0))]);
    await store.record(1, [item("A", 6.4, hojeMenos(0, 30))]); // venda mais recente de A no mesmo dia
    await store.record(1, [item("A", 9.9, hojeMenos(0, -30))]); // venda mais antiga: ignorada

    const h = await store.query(MACEIO, 1, 30);
    expect(h.municipio).toBe("MACEIO");
    expect(h.desde).toBe(dataLocal(hojeMenos(1)));
    expect(h.serie).toEqual([
      { data: dataLocal(hojeMenos(1)), media: 5.5, minimo: 5, maximo: 6, postos: 2 },
      { data: dataLocal(hojeMenos(0)), media: 6.1, minimo: 5.8, maximo: 6.4, postos: 2 },
    ]);
  });

  it("separa por município e combustível, respeita o período e a cobertura mínima", async () => {
    await store.record(1, [item("A", 6, hojeMenos(0)), item("X", 7, hojeMenos(0), ARAPIRACA, "ARAPIRACA")]);
    await store.record(3, [item("A", 4, hojeMenos(0))]);
    await store.record(1, [item("A", 5, hojeMenos(40))]);
    await store.record(5, [item("P", 9, hojeMenos(1))]); // dia com 1 posto...
    await store.record(5, ["Q", "R", "S", "T"].map((c) => item(c, 6, hojeMenos(0)))); // ...vs 4: descartado

    expect((await store.query(MACEIO, 1, 30)).serie.map((p) => p.media)).toEqual([6]);
    expect((await store.query(MACEIO, 1, 90)).serie).toHaveLength(2);
    expect((await store.query(MACEIO, 3, 30)).serie[0]!.media).toBe(4);
    expect((await store.query(ARAPIRACA, 1, 30)).municipio).toBe("ARAPIRACA");
    expect((await store.query(MACEIO, 5, 30)).serie.map((p) => p.postos)).toEqual([4]);
  });

  it("não troca o nome do município pelo código quando a API não informa o nome", async () => {
    await store.record(1, [item("A", 6, hojeMenos(0))]);
    await store.record(1, [item("B", 6, hojeMenos(0), MACEIO, undefined)]);
    expect((await store.query(MACEIO, 1, 30)).municipio).toBe("MACEIO");
  });

  it("todas as migrations do disco estão registradas", async () => {
    const res = await pool.query<{ name: string }>(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY run_on, id`);
    expect(res.rows.map((r) => r.name)).toEqual(migrationNames());
  });

  it("município sem dados devolve série vazia", async () => {
    const h = await store.query(9999999, 1, 30);
    expect(h).toEqual({ codigoIBGE: 9999999, municipio: null, tipoCombustivel: 1, desde: null, serie: [] });
  });
});
