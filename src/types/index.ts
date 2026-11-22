export type HighlightKind = "mais-barato" | "mais-perto" | "melhor-custo";
export type FilterType = HighlightKind | null;

export interface GasStation {
  /** CNPJ do estabelecimento (único por posto) */
  id: string;
  name: string;
  address: string;
  /** Distância em km até o usuário; null se não houver coordenadas */
  distance: number | null;
  price: number;
  fuel: string;
  /** [lat, lon]; null se a API não informar coordenadas */
  position: [number, number] | null;
  /** Destaques calculados sobre a lista visível (melhor custo, mais barato, mais perto) */
  highlights?: HighlightKind[];
  razaoSocial?: string;
  cnpj?: string;
  codigoIBGE?: number;
  municipio?: string;
}

/** Corpo enviado pelo frontend ao nosso backend (que monta o contrato da SEFAZ). */
export interface BuscaCombustivelParams {
  latitude: number;
  longitude: number;
  tipoCombustivel?: number; // 1-6
  raio?: number; // km, 1-15
  dias?: number; // 1-10
}

/** Item retornado pela API em `conteudo[]` (formato verificado em 2026-11). */
export interface CombustivelItem {
  produto?: {
    codigo?: string;
    descricao?: string;
    unidadeMedida?: string;
    venda?: {
      dataVenda?: string;
      valorDeclarado?: number;
      valorVenda?: number;
    };
  };
  estabelecimento?: {
    cnpj?: string;
    razaoSocial?: string;
    nomeFantasia?: string;
    telefone?: string;
    endereco?: {
      nomeLogradouro?: string;
      numeroImovel?: string;
      bairro?: string;
      cep?: string;
      codigoIBGE?: number;
      municipio?: string;
      latitude?: number;
      longitude?: number;
    };
  };
}

export interface PontoDiario {
  data: string; // AAAA-MM-DD
  media: number;
  minimo: number;
  maximo: number;
  postos: number;
}

/** Resposta de GET /api/economiza/historico */
export interface HistoricoResposta {
  codigoIBGE: number;
  municipio: string | null;
  tipoCombustivel: number;
  desde: string | null;
  serie: PontoDiario[];
}

/** Resposta do nosso backend para /api/economiza/combustiveis */
export interface CombustiveisResponse {
  totalRegistros: number;
  conteudo: CombustivelItem[];
}
