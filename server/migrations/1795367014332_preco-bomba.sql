-- A API informa dois preços: valorDeclarado (preço da bomba) e valorVenda (valor efetivo da
-- última venda, que pode incluir desconto). Até aqui só o de venda era guardado, em `preco`.
-- Registros anteriores a esta migration ficam com preco_bomba NULL.

-- Up Migration

ALTER TABLE precos_diarios RENAME COLUMN preco TO preco_venda;
ALTER TABLE precos_diarios ADD COLUMN preco_bomba numeric(8, 4) CHECK (preco_bomba > 0);

-- Down Migration

ALTER TABLE precos_diarios DROP COLUMN preco_bomba;
ALTER TABLE precos_diarios RENAME COLUMN preco_venda TO preco;
