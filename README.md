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
ECONOMIZA_BASE_URL=https://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public
PORT=3333
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
TRUST_PROXY=
CACHE_TTL_MINUTES=10
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
| raiz | `npm run lint` | ESLint no frontend e no servidor |
| raiz | `npm test` | Testes do frontend (Vitest, só `src/`) |
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
- `GET /health`: o processo está no ar (não consulta o banco; use no monitoramento)
- `GET /health/ready`: confere o banco (`503` se indisponível)
- Buscas ficam em cache por `CACHE_TTL_MINUTES` (padrão 10). As coordenadas são arredondadas para
  ~1 km, então usuários próximos reaproveitam a mesma consulta (a SEFAZ leva de 5 a 9 s por página).
  O cabeçalho `X-Cache` indica `HIT` ou `MISS`
- Atrás de proxy reverso, defina `TRUST_PROXY` (ex.: `1`) para o rate limit identificar cada usuário
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

- Preço da bomba: `produto.venda.valorDeclarado`. É o preço exibido no app e usado no histórico
- Valor da última venda: `produto.venda.valorVenda`. Costuma ser igual ao da bomba, mas pode ser
  menor (desconto naquela venda); o app mostra os dois quando diferem
- Data da última venda: `produto.venda.dataVenda` (pode ter até `dias` dias; o app avisa quando passa de 24 h)
- Endereço e coordenadas: `estabelecimento.endereco.{nomeLogradouro, numeroImovel, bairro, municipio, latitude, longitude}`
- Paginação: `registrosPorPagina` pequeno (ex.: 10) é rejeitado com HTTP 400; o backend usa 100

### Histórico de preços

A API da SEFAZ só informa a **venda mais recente de cada posto**; não existe série histórica.
Por isso o backend monta o histórico:

- Ao iniciar e a cada `HISTORY_INTERVAL_HOURS` horas, coleta os 6 combustíveis dos municípios
  em `HISTORY_MUNICIPIOS` (códigos IBGE; padrão Maceió). As buscas dos usuários também são registradas.
- Guarda, por dia, o último preço de cada posto no Postgres (Neon, projeto `tanquei`, região `aws-sa-east-1`).
  São guardados o preço da bomba (`preco_bomba`) e o da venda (`preco_venda`); a série usa o da bomba e,
  em registros antigos sem ele, o da venda.
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

## CI

`.github/workflows/ci.yml` roda em cada push na `main` e em cada PR:

| Job | O que faz |
|-----|-----------|
| Frontend | lint, typecheck, testes e build |
| Servidor | typecheck, testes de unidade, build e build da imagem Docker |
| Banco | `npm run test:db` numa branch descartável do Neon (só em PRs) |

O job de banco precisa, em *Settings → Secrets and variables → Actions* do repositório:

- secret `NEON_API_KEY` (crie em console.neon.tech → Account settings → API keys)
- variável `NEON_PROJECT_ID` = `noisy-glade-62015002`

Sem eles (ou em PRs de forks, que não recebem secrets), o job é pulado com um aviso.

## Deploy

| Parte | Onde | Configuração essencial |
|-------|------|------------------------|
| Frontend (raiz) | Vercel (preset Vite, saída `dist`) | `VITE_API_BASE` = URL completa do servidor, com `https://`, sem `/api` e sem barra no final. É lida no build: depois de mudar, faça *Redeploy* |
| Servidor (`server/`) | Railway (Root Directory `/server`, usa o `Dockerfile`) | Variáveis do `.env.example` sem aspas, `NODE_ENV=production`, `TRUST_PROXY=1`, `CORS_ORIGINS` com o domínio da Vercel. *Pre-deploy Command*: `npm run migrate`. *Healthcheck Path*: `/health`. *Serverless* desligado (a coleta do histórico precisa do processo ativo) |

Rode uma única instância do servidor: cada instância faz a própria coleta e tem o próprio cache.

## Notas

- Postos sem coordenadas aparecem só na lista, ordenados por último em "Mais perto".

## Licença

O código do Tanquei é distribuído sob a licença [MIT](LICENSE).

A licença cobre apenas o código deste repositório. Os dados de preços vêm da API EconomizaAlagoas
(SEFAZ-AL): para rodar o projeto, use seu próprio token e siga os termos de uso da SEFAZ.
Os mapas usam tiles e dados do [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL),
com a atribuição exibida no mapa.
