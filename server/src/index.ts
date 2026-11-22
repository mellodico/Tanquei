import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createEconomizaClient } from "./economiza";
import { HistoryStore } from "./history";
import { createPool } from "./db/pool";
import { assertMigrated } from "./db/migrations";
import { TtlCache, parseTrustProxy, roundCoord } from "./cache";
import { originMatcher, parseOrigins } from "./cors";

dotenv.config();

const isDev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT ?? 3333);

const BASE = (process.env.ECONOMIZA_BASE_URL ?? "").replace(/\/+$/, "");
const TOKEN = process.env.ECONOMIZA_APP_TOKEN ?? "";
if (!BASE) throw new Error("ECONOMIZA_BASE_URL não definido");
if (!TOKEN) throw new Error("ECONOMIZA_APP_TOKEN não definido");
const DATABASE_URL = process.env.DATABASE_URL ?? "";
if (!DATABASE_URL) throw new Error("DATABASE_URL não definido (string de conexão pooled do Neon)");

// Origens permitidas (separadas por vírgula, aceita "*"; ver cors.ts). Em dev, o Vite faz proxy.
const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS);
const isAllowedOrigin = originMatcher(allowedOrigins);

const HISTORY_MUNICIPIOS = (process.env.HISTORY_MUNICIPIOS ?? "2704302") // Maceió
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);
const HISTORY_INTERVAL_HOURS = Number(process.env.HISTORY_INTERVAL_HOURS ?? 6);
const TIPOS_COMBUSTIVEL = [1, 2, 3, 4, 5, 6];
const CACHE_TTL_MINUTES = Number(process.env.CACHE_TTL_MINUTES ?? 10);
// Atrás de um proxy reverso, sem isso todos os usuários teriam o IP do proxy e dividiriam o rate limit.
const TRUST_PROXY = parseTrustProxy(process.env.TRUST_PROXY);

function log(...args: unknown[]) {
  if (isDev) console.log(...args);
}

const economiza = createEconomizaClient({ baseUrl: BASE, token: TOKEN, log });
const pool = createPool(DATABASE_URL);
const history = new HistoryStore(pool);
const buscaCache = new TtlCache<Awaited<ReturnType<typeof economiza.pesquisarCombustiveis>>>(
  CACHE_TTL_MINUTES * 60_000,
);

const app = express();
app.set("trust proxy", TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)) }));
app.use(express.json({ limit: "10kb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Liveness: não toca no banco. É a rota para o monitoramento frequente da hospedagem; consultar
// o banco a cada poucos segundos impediria o Neon de desligar a computação ociosa (scale to zero).
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness: confere o banco. Para checagens manuais ou pouco frequentes.
app.get("/health/ready", async (_req, res) => {
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), 10_000);
      }),
    ]);
    res.json({ status: "ok", database: "ok", latencyMs: Date.now() - started });
  } catch (e) {
    console.error("Health: banco indisponível:", (e as Error).message);
    res.status(503).json({ status: "error", database: "unavailable" });
  } finally {
    clearTimeout(timer);
  }
});

function num(v: unknown, min: number, max: number, fallback?: number): number | null {
  if ((v === undefined || v === "") && fallback !== undefined) return fallback;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function int(v: unknown, min: number, max: number, fallback?: number): number | null {
  const n = num(v, min, max, fallback);
  return n !== null && Number.isInteger(n) ? n : null;
}

// Combustível: o cliente envia só parâmetros simples; o corpo da SEFAZ é montado aqui,
// para o backend não funcionar como proxy aberto do nosso token.
app.post("/api/economiza/combustiveis", async (req, res) => {
  const b = req.body ?? {};
  const latitude = typeof b.latitude === "number" ? num(b.latitude, -90, 90) : null;
  const longitude = typeof b.longitude === "number" ? num(b.longitude, -180, 180) : null;
  const tipoCombustivel = int(b.tipoCombustivel, 1, 6, 1);
  const raio = num(b.raio, 1, 15, 15);
  const dias = int(b.dias, 1, 10, 5);

  if (latitude === null || longitude === null || tipoCombustivel === null || raio === null || dias === null) {
    res.status(400).json({
      error: "Parâmetros inválidos: latitude, longitude obrigatórios; tipoCombustivel 1-6; raio 1-15; dias 1-10.",
    });
    return;
  }

  const lat = roundCoord(latitude);
  const lon = roundCoord(longitude);
  try {
    const { value: data, hit } = await buscaCache.getOrLoad(
      `${lat}|${lon}|${raio}|${tipoCombustivel}|${dias}`,
      () =>
        economiza.pesquisarCombustiveis({
          tipoCombustivel,
          estabelecimento: { geolocalizacao: { latitude: lat, longitude: lon, raio } },
          dias,
        }),
    );
    res.set("X-Cache", hit ? "HIT" : "MISS").json(data);
    if (!hit) {
      // Buscas dos usuários também alimentam o histórico (sem atrasar a resposta)
      history
        .record(tipoCombustivel, data.conteudo)
        .catch((e) => console.error("Histórico: falha ao gravar busca:", (e as Error).message));
    }
  } catch (e) {
    console.error("Erro ao buscar combustíveis:", (e as Error).message);
    res.status(502).json({ error: "Falha ao consultar a API EconomizaAlagoas. Tente novamente." });
  }
});

app.get("/api/economiza/historico", async (req, res) => {
  const codigoIBGE = int(req.query.codigoIBGE, 1_000_000, 9_999_999);
  const tipoCombustivel = int(req.query.tipoCombustivel, 1, 6, 1);
  const dias = int(req.query.dias, 1, 365, 30);
  if (codigoIBGE === null || tipoCombustivel === null || dias === null) {
    res.status(400).json({ error: "Parâmetros inválidos: codigoIBGE (7 dígitos), tipoCombustivel 1-6, dias 1-365." });
    return;
  }
  try {
    res.json(await history.query(codigoIBGE, tipoCombustivel, dias));
  } catch (e) {
    console.error("Erro ao consultar histórico:", (e as Error).message);
    res.status(500).json({ error: "Falha ao consultar o histórico de preços." });
  }
});

let collecting = false;
async function collectHistory() {
  if (collecting) return;
  collecting = true;
  try {
    for (const codigoIBGE of HISTORY_MUNICIPIOS) {
      for (const tipoCombustivel of TIPOS_COMBUSTIVEL) {
        try {
          const data = await economiza.pesquisarCombustiveis({
            tipoCombustivel,
            estabelecimento: { municipio: { codigoIBGE } },
            dias: 1,
          });
          const n = await history.record(tipoCombustivel, data.conteudo);
          log(`Histórico: IBGE ${codigoIBGE}, tipo ${tipoCombustivel}: ${n} preços`);
        } catch (e) {
          console.error(`Histórico: falha IBGE ${codigoIBGE} tipo ${tipoCombustivel}:`, (e as Error).message);
        }
      }
    }
  } finally {
    collecting = false;
  }
}

async function main() {
  await assertMigrated(pool);

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    log(`Base URL: ${BASE}`);
    log(`CORS origins: ${allowedOrigins.join(", ")}`);
    log(`Cache de buscas: ${CACHE_TTL_MINUTES} min · trust proxy: ${JSON.stringify(TRUST_PROXY)}`);
    log(`Histórico: Postgres (municípios ${HISTORY_MUNICIPIOS.join(", ")}, a cada ${HISTORY_INTERVAL_HOURS}h)`);
  });

  if (HISTORY_MUNICIPIOS.length > 0 && HISTORY_INTERVAL_HOURS > 0) {
    void collectHistory();
    setInterval(() => void collectHistory(), HISTORY_INTERVAL_HOURS * 3_600_000).unref();
  }

  const shutdown = async () => {
    server.close();
    await pool.end().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("Falha ao iniciar o servidor:", (e as Error).message);
  process.exit(1);
});
