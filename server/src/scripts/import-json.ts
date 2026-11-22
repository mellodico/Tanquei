/**
 * Importa o histórico antigo (arquivo JSON do HistoryStore anterior) para o Postgres.
 * Uso: npm run db:import-json -- [caminho]   (padrão: data/history.json)
 *
 * O JSON não guardava o horário da venda nem o nome do posto; o horário é registrado
 * como 00:00 do dia (America/Maceio) e o nome fica vazio até a próxima coleta.
 * Pode ser executado mais de uma vez: dados já existentes mais recentes não são sobrescritos.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createPool } from "../db/pool";
import { HistoryStore, type PrecoRow } from "../history";
import { assertMigrated } from "../db/migrations";

dotenv.config();

interface HistoryJson {
  versao: 1;
  municipios: Record<string, string>;
  dados: Record<string, Record<string, Record<string, Record<string, number>>>>;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definido");
  const file = path.resolve(process.argv[2] ?? "data/history.json");
  const json = JSON.parse(readFileSync(file, "utf8")) as HistoryJson;
  if (json.versao !== 1) throw new Error(`Formato não reconhecido em ${file}`);

  const pool = createPool(url);
  const store = new HistoryStore(pool);
  try {
    await assertMigrated(pool);
    let total = 0;
    for (const [ibge, porTipo] of Object.entries(json.dados)) {
      for (const [tipo, porDia] of Object.entries(porTipo)) {
        const rows: PrecoRow[] = [];
        for (const [data, porPosto] of Object.entries(porDia)) {
          for (const [cnpj, preco] of Object.entries(porPosto)) {
            rows.push({
              data,
              cnpj,
              codigoIBGE: Number(ibge),
              municipio: json.municipios[ibge] ?? null,
              nomeFantasia: null,
              razaoSocial: null,
              precoBomba: null,
              precoVenda: preco,
              vendidoEm: `${data}T00:00:00-03:00`,
            });
          }
        }
        const n = await store.recordRows(Number(tipo), rows);
        console.log(`IBGE ${ibge}, tipo ${tipo}: ${n}/${rows.length} preços importados`);
        total += n;
      }
    }
    console.log(`Total: ${total} preços importados de ${file}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
