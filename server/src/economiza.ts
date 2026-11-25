export class UpstreamError extends Error {}

export interface EconomizaConfig {
  baseUrl: string;
  token: string;
  log: (...args: unknown[]) => void;
}

/** Item de `conteudo[]` (só os campos que o servidor usa). */
export interface CombustivelItem {
  produto?: { venda?: { dataVenda?: string; valorVenda?: number; valorDeclarado?: number } };
  estabelecimento?: {
    cnpj?: string;
    nomeFantasia?: string;
    razaoSocial?: string;
    endereco?: { codigoIBGE?: number; municipio?: string };
  };
}

/** Página da pesquisa de combustíveis (campos opcionais: a API não é confiável quanto a eles). */
interface PaginaCombustivel {
  totalRegistros?: number;
  totalPaginas?: number;
  ultimaPagina?: boolean;
  conteudo?: unknown;
}

export type EstabelecimentoFiltro =
  | { geolocalizacao: { latitude: number; longitude: number; raio: number } }
  | { municipio: { codigoIBGE: number } };

const REGISTROS_POR_PAGINA = 100; // a API aceita até ~100; valores pequenos (ex.: 10) são rejeitados
const MAX_PAGINAS = 5;

export function createEconomizaClient({ baseUrl, token, log }: EconomizaConfig) {
  async function post(path: string, body: unknown): Promise<unknown> {
    const started = Date.now();
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", AppToken: token },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
      // Seguir 301/302 faz o fetch trocar POST por GET (a API responde 405); falhar com mensagem clara.
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      console.error(`Upstream ${path} redirecionou (${res.status}) para ${location}; ajuste ECONOMIZA_BASE_URL`);
      throw new UpstreamError(`HTTP ${res.status}`);
    }
    const text = await res.text();
    log(`POST ${path} -> ${res.status} (${Date.now() - started}ms)`);

    if (!res.ok) {
      // Detalhes só no log do servidor; o cliente recebe mensagem genérica.
      console.error(`Upstream ${path} ${res.status}: ${text.slice(0, 300)}`);
      throw new UpstreamError(`HTTP ${res.status}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new UpstreamError("Resposta inválida da API");
    }
  }

  async function pesquisarCombustiveis(params: {
    tipoCombustivel: number;
    estabelecimento: EstabelecimentoFiltro;
    dias: number;
  }): Promise<{ totalRegistros: number; conteudo: CombustivelItem[] }> {
    const conteudo: CombustivelItem[] = [];
    let totalRegistros = 0;
    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      const data = (await post("/combustivel/pesquisa", {
        produto: { tipoCombustivel: params.tipoCombustivel },
        estabelecimento: params.estabelecimento,
        dias: params.dias,
        pagina,
        registrosPorPagina: REGISTROS_POR_PAGINA,
      })) as PaginaCombustivel | null;
      totalRegistros = data?.totalRegistros ?? 0;
      if (Array.isArray(data?.conteudo)) conteudo.push(...(data.conteudo as CombustivelItem[]));
      if (data?.ultimaPagina !== false || pagina >= (data?.totalPaginas ?? 1)) break;
    }
    return { totalRegistros, conteudo };
  }

  return { pesquisarCombustiveis };
}

export type EconomizaClient = ReturnType<typeof createEconomizaClient>;
