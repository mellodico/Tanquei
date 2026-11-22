/**
 * Histórico de preços, guardado no Postgres (Neon).
 *
 * A API da SEFAZ só devolve a venda mais recente de cada posto (não há série histórica),
 * então o servidor guarda, por dia, o último preço de venda de cada posto e calcula
 * média/mínimo/máximo diários por município e tipo de combustível.
 */

import type { Pool } from "pg";
import type { CombustivelItem } from "./economiza";

export interface PontoDiario {
  data: string; // AAAA-MM-DD
  media: number;
  minimo: number;
  maximo: number;
  postos: number;
}

export interface HistoricoResposta {
  codigoIBGE: number;
  municipio: string | null;
  tipoCombustivel: number;
  /** Primeiro dia com dados guardados para esse município/combustível */
  desde: string | null;
  serie: PontoDiario[];
}

export interface PrecoRow {
  data: string;
  cnpj: string;
  codigoIBGE: number;
  municipio: string | null;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  /** valorDeclarado da API; null quando não informado */
  precoBomba: number | null;
  precoVenda: number;
  vendidoEm: string;
}

/**
 * Dias com poucos postos (ex.: o dia anterior ao início da coleta, que só tem os postos
 * cuja última venda foi naquele dia) distorcem a média. Só entram na série os dias com
 * pelo menos esta fração do maior número de postos observado no período.
 */
export const COBERTURA_MINIMA = 0.3;

const OFFSET_ALAGOAS_MS = -3 * 60 * 60 * 1000; // UTC-3, sem horário de verão

/** Data (AAAA-MM-DD) no fuso de Alagoas */
export function dataLocal(iso: string | Date): string | null {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + OFFSET_ALAGOAS_MS).toISOString().slice(0, 10);
}

/**
 * Converte itens da API em linhas válidas. A API devolve um item por produto, então um posto
 * pode aparecer mais de uma vez no mesmo tipo (ex.: aditivada comum e premium): fica o
 * produto mais barato; em empate de preço, a venda mais recente.
 */
export function toRows(items: CombustivelItem[]): PrecoRow[] {
  const rows = new Map<string, PrecoRow>();
  for (const item of items) {
    const est = item.estabelecimento;
    const cnpj = est?.cnpj;
    const ibge = est?.endereco?.codigoIBGE;
    const precoBomba = positivo(item.produto?.venda?.valorDeclarado);
    const precoVenda = positivo(item.produto?.venda?.valorVenda) ?? precoBomba;
    const vendidoEm = item.produto?.venda?.dataVenda;
    const data = vendidoEm ? dataLocal(vendidoEm) : null;
    if (!cnpj || typeof ibge !== "number" || precoVenda === null || !data) continue;

    const key = `${data}|${cnpj}`;
    const prev = rows.get(key);
    if (prev) {
      const preco = precoBomba ?? precoVenda;
      const precoAnterior = prev.precoBomba ?? prev.precoVenda;
      if (preco > precoAnterior || (preco === precoAnterior && prev.vendidoEm >= vendidoEm!)) continue;
    }
    rows.set(key, {
      data,
      cnpj,
      codigoIBGE: ibge,
      municipio: est?.endereco?.municipio ?? null,
      nomeFantasia: est?.nomeFantasia ?? null,
      razaoSocial: est?.razaoSocial ?? null,
      precoBomba,
      precoVenda,
      vendidoEm: vendidoEm!,
    });
  }
  return [...rows.values()];
}

function positivo(v: unknown): number | null {
  return typeof v === "number" && v > 0 ? Math.round(v * 10_000) / 10_000 : null;
}

export class HistoryStore {
  constructor(private readonly pool: Pool) {}

  async record(tipoCombustivel: number, items: CombustivelItem[]): Promise<number> {
    return this.recordRows(tipoCombustivel, toRows(items));
  }

  async recordRows(tipoCombustivel: number, rows: PrecoRow[]): Promise<number> {
    if (rows.length === 0) return 0;

    const municipios = new Map<number, string | null>();
    const postos = new Map<string, PrecoRow>();
    for (const r of rows) {
      if (r.municipio || !municipios.has(r.codigoIBGE)) municipios.set(r.codigoIBGE, r.municipio);
      postos.set(r.cnpj, r);
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        // Sem nome: grava o código como nome provisório, que nunca sobrescreve um nome real.
        `INSERT INTO municipios (codigo_ibge, nome)
         SELECT c, COALESCE(n, c::text) FROM unnest($1::int[], $2::text[]) AS t(c, n)
         ON CONFLICT (codigo_ibge) DO UPDATE SET nome = EXCLUDED.nome
         WHERE EXCLUDED.nome <> EXCLUDED.codigo_ibge::text
           AND municipios.nome IS DISTINCT FROM EXCLUDED.nome`,
        [[...municipios.keys()], [...municipios.values()]],
      );
      const ps = [...postos.values()];
      await client.query(
        `INSERT INTO postos (cnpj, nome_fantasia, razao_social, codigo_ibge)
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::int[])
         ON CONFLICT (cnpj) DO UPDATE SET
           nome_fantasia = COALESCE(EXCLUDED.nome_fantasia, postos.nome_fantasia),
           razao_social  = COALESCE(EXCLUDED.razao_social, postos.razao_social),
           codigo_ibge   = EXCLUDED.codigo_ibge,
           atualizado_em = now()`,
        [ps.map((p) => p.cnpj), ps.map((p) => p.nomeFantasia), ps.map((p) => p.razaoSocial), ps.map((p) => p.codigoIBGE)],
      );
      // Substitui o preço do dia se a venda for mais recente ou se o preço for menor (outro
      // produto do mesmo tipo, mais barato, vendido antes; ver toRows).
      const res = await client.query(
        `INSERT INTO precos_diarios (data, tipo_combustivel, cnpj, codigo_ibge, preco_bomba, preco_venda, vendido_em)
         SELECT d, $1::smallint, c, i, pb, pv, v
         FROM unnest($2::date[], $3::text[], $4::int[], $5::numeric[], $6::numeric[], $7::timestamptz[])
           AS t(d, c, i, pb, pv, v)
         ON CONFLICT (data, tipo_combustivel, cnpj) DO UPDATE SET
           preco_bomba = COALESCE(EXCLUDED.preco_bomba, precos_diarios.preco_bomba),
           preco_venda = EXCLUDED.preco_venda,
           codigo_ibge = EXCLUDED.codigo_ibge,
           vendido_em = EXCLUDED.vendido_em,
           atualizado_em = now()
         WHERE EXCLUDED.vendido_em >= precos_diarios.vendido_em
            OR COALESCE(EXCLUDED.preco_bomba, EXCLUDED.preco_venda)
               < COALESCE(precos_diarios.preco_bomba, precos_diarios.preco_venda)`,
        [
          tipoCombustivel,
          rows.map((r) => r.data),
          rows.map((r) => r.cnpj),
          rows.map((r) => r.codigoIBGE),
          rows.map((r) => r.precoBomba),
          rows.map((r) => r.precoVenda),
          rows.map((r) => r.vendidoEm),
        ],
      );
      await client.query("COMMIT");
      return res.rowCount ?? 0;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  async query(codigoIBGE: number, tipoCombustivel: number, dias: number): Promise<HistoricoResposta> {
    const hoje = dataLocal(new Date())!;
    const [serieRes, metaRes] = await Promise.all([
      this.pool.query<{ data: string; media: string; minimo: string; maximo: string; postos: number }>(
        // Preço da bomba quando disponível; registros antigos só têm o de venda.
        `WITH precos AS (
           SELECT data, COALESCE(preco_bomba, preco_venda) AS preco
           FROM precos_diarios
           WHERE codigo_ibge = $1 AND tipo_combustivel = $2
             AND data >= $3::date - ($4::int - 1)
         ),
         dias AS (
           SELECT data::text AS data,
                  round(avg(preco), 4) AS media,
                  min(preco) AS minimo,
                  max(preco) AS maximo,
                  count(*)::int AS postos
           FROM precos
           GROUP BY data
         )
         SELECT * FROM dias
         WHERE postos >= (SELECT max(postos) FROM dias) * $5::numeric
         ORDER BY data`,
        [codigoIBGE, tipoCombustivel, hoje, dias, COBERTURA_MINIMA],
      ),
      this.pool.query<{ nome: string | null; desde: string | null }>(
        `SELECT (SELECT nome FROM municipios WHERE codigo_ibge = $1) AS nome,
                (SELECT min(data)::text FROM precos_diarios
                  WHERE codigo_ibge = $1 AND tipo_combustivel = $2) AS desde`,
        [codigoIBGE, tipoCombustivel],
      ),
    ]);

    return {
      codigoIBGE,
      municipio: metaRes.rows[0]?.nome ?? null,
      tipoCombustivel,
      desde: metaRes.rows[0]?.desde ?? null,
      serie: serieRes.rows.map((r) => ({
        data: r.data,
        media: Number(r.media),
        minimo: Number(r.minimo),
        maximo: Number(r.maximo),
        postos: r.postos,
      })),
    };
  }
}
