-- Usa IF NOT EXISTS porque a branch main do Neon já tinha estas tabelas antes das migrations
-- (eram criadas na inicialização do servidor); assim a migration é registrada sem erro.

-- Up Migration

CREATE TABLE IF NOT EXISTS municipios (
  codigo_ibge  integer PRIMARY KEY,
  nome         text NOT NULL
);

CREATE TABLE IF NOT EXISTS postos (
  cnpj           text PRIMARY KEY,
  nome_fantasia  text,
  razao_social   text,
  codigo_ibge    integer REFERENCES municipios (codigo_ibge),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- Último preço de venda de cada posto, por dia (fuso de Alagoas) e tipo de combustível.
CREATE TABLE IF NOT EXISTS precos_diarios (
  data              date        NOT NULL,
  tipo_combustivel  smallint    NOT NULL CHECK (tipo_combustivel BETWEEN 1 AND 6),
  cnpj              text        NOT NULL REFERENCES postos (cnpj),
  codigo_ibge       integer     NOT NULL REFERENCES municipios (codigo_ibge),
  preco             numeric(8, 4) NOT NULL CHECK (preco > 0),
  vendido_em        timestamptz NOT NULL,
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (data, tipo_combustivel, cnpj)
);

-- Consulta principal: série diária de um município/combustível num período.
CREATE INDEX IF NOT EXISTS precos_diarios_municipio_idx
  ON precos_diarios (codigo_ibge, tipo_combustivel, data);

-- Down Migration

DROP TABLE IF EXISTS precos_diarios;
DROP TABLE IF EXISTS postos;
DROP TABLE IF EXISTS municipios;
