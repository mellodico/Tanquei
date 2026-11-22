# Tanquei - Consultor de Combustíveis e Preços

Aplicação para consultar preços de combustíveis em Alagoas usando a API EconomizaAlagoas (SEFAZ-AL).

## Como Iniciar

### 1. Instalar Dependências

```bash
npm install          # frontend
cd server && npm install
```

### 2. Configurar Variáveis de Ambiente

Copie `server/.env.example` para `server/.env` e preencha:

```env
ECONOMIZA_APP_TOKEN=seu_token_aqui
ECONOMIZA_BASE_URL=http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public
PORT=3333
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://...-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=verify-full
HISTORY_MUNICIPIOS=2704302
HISTORY_INTERVAL_HOURS=6
```

> **Atenção:** não faça commit do `.env` (já está no `.gitignore`).

### 3. Executar

```bash
# Terminal 1 - backend
cd server && npm run dev

# Terminal 2 - frontend
npm run dev
```

Acesse `http://localhost:5173`. Em dev, o Vite faz proxy de `/api` para `http://localhost:3333`.

### Scripts

| Onde | Script | O que faz |
|------|--------|-----------|
| raiz | `npm run dev` / `build` / `preview` | Vite (o `build` roda o typecheck antes) |
| raiz | `npm run typecheck` | `tsc --noEmit` |
| raiz | `npm test` | Testes (Vitest) do mapeamento da API |
| server | `npm run dev` | Backend com reload |
| server | `npm run build` + `npm start` | Compila para `dist/` e executa |
| server | `npm test` | Testes de unidade (os de banco são pulados) |
| server | `npm run test:db` | Todos os testes, numa branch descartável do Neon |
| server | `npm run migrate` | Aplica as migrations pendentes no banco do `DATABASE_URL` |
| server | `npm run migrate:create -- <nome>` | Cria uma nova migration SQL em `server/migrations/` |
| server | `npm run migrate:down` | Desfaz a última migration |
| server | `npm run db:import-json -- [arquivo]` | Importa o histórico antigo em JSON para o banco |

## Arquitetura

### Frontend (Vite + React + TypeScript)
- `src/services/economiza.ts`: chama o backend e converte a resposta em `GasStation[]`
- `src/hooks/useGeolocation.ts`: localização do usuário; se indisponível, usa o centro de Maceió e avisa na tela
- `src/types/index.ts`: tipos compartilhados (incluindo o formato real da resposta da API)
- Em produção, defina `VITE_API_BASE` se o backend estiver em outro domínio

### Backend (Express, `server/`)
- `POST /api/economiza/combustiveis`
  - Corpo: `{ latitude, longitude, tipoCombustivel?: 1-6, raio?: 1-15, dias?: 1-10 }`
  - O backend valida os parâmetros, monta o corpo da SEFAZ e busca todas as páginas (até 500 registros)
  - Resposta: `{ totalRegistros, conteudo: CombustivelItem[] }`
- `GET /api/economiza/historico?codigoIBGE=2704302&tipoCombustivel=1&dias=30`
  - Série diária `{ data, media, minimo, maximo, postos }` do município
- `GET /health`
- O token nunca sai do servidor; o cliente não consegue enviar corpos arbitrários para a SEFAZ
- CORS restrito a `CORS_ORIGINS`; rate limit de 60 req/min por IP

### Códigos de combustível (`tipoCombustivel`)

| Código | Combustível |
|--------|-------------|
| 1 | Gasolina Comum |
| 2 | Gasolina Aditivada |
| 3 | Etanol |
| 4 | Diesel Comum |
| 5 | Diesel S10 |
| 6 | GNV |

### Formato da resposta da SEFAZ (resumo)

- Preço: `produto.venda.valorVenda`
- Endereço e coordenadas: `estabelecimento.endereco.{nomeLogradouro, numeroImovel, bairro, municipio, latitude, longitude}`
- Paginação: `registrosPorPagina` pequeno (ex.: 10) é rejeitado com HTTP 400; o backend usa 100

### Histórico de preços

A API da SEFAZ só informa a **venda mais recente de cada posto**; não existe série histórica.
Por isso o backend monta o histórico:

- Ao iniciar e a cada `HISTORY_INTERVAL_HOURS` horas, coleta os 6 combustíveis dos municípios
  em `HISTORY_MUNICIPIOS` (códigos IBGE; padrão Maceió). As buscas dos usuários também são registradas.
- Guarda, por dia, o último preço de cada posto no Postgres (Neon, projeto `tanquei`, região `aws-sa-east-1`).
- Tabelas (ver `server/migrations/`): `municipios`, `postos` e `precos_diarios`
  (chave: data + tipo de combustível + CNPJ; só é substituído por uma venda mais recente).
- Dias com menos de 30% dos postos do período são omitidos para não distorcer a média.
- O gráfico mostra o município do posto mais próximo do usuário. O histórico começa no dia em que o
  servidor passa a rodar, então os primeiros dias têm poucos pontos.
- Em produção, o servidor precisa ficar ligado para coletar todos os dias.

### Banco de dados (Neon)

Projeto Neon `tanquei` (região `aws-sa-east-1`). Cada ambiente é uma branch:

| Ambiente | Branch | Uso |
|----------|--------|-----|
| Produção | `main` | Servidor de produção (`DATABASE_URL` configurado no host) |
| Desenvolvimento | `dev` | `server/.env` local; cópia dos dados da `main` |
| Testes | `test-<timestamp>` | Criada e apagada por `npm run test:db` (expira em 1 h se algo falhar) |

- `server/.neon` (ignorado pelo git) aponta o CLI para a branch `dev`.
- Para atualizar a `dev` com os dados atuais da produção: `neon branches reset dev --parent`.
- Strings de conexão: `neon cs <branch> --pooled --ssl verify-full`.

### Migrations (node-pg-migrate)

O esquema é definido só pelas migrations em `server/migrations/` (SQL, com seções `-- Up Migration`
e `-- Down Migration`). O servidor **não** cria tabelas: ao iniciar, ele confere a tabela
`pgmigrations` e se recusa a subir se houver migration pendente.

Fluxo para mudar o esquema:

1. `npm run migrate:create -- descricao-da-mudanca` e escreva o SQL (Up e Down)
2. `npm run migrate` (aplica na `dev`, via `.env`)
3. `npm run test:db` (aplica numa cópia da `main` e roda os testes; valida também o Down)
4. `neon diff` para revisar a diferença de esquema entre `dev` e `main`
5. No deploy: `npm run migrate` com o `DATABASE_URL` de produção **antes** de `npm start`

No CI, `npm run test:db` precisa de `NEON_API_KEY` e `NEON_PROJECT_ID` (o projeto é `noisy-glade-62015002`).

## Notas

- Postos sem coordenadas aparecem só na lista, ordenados por último em "Mais perto".
