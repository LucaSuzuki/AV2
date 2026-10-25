ALTER TABLE organizacoes ADD CONSTRAINT ck_cnpj_14 CHECK (cnpj ~ '^[0-9]{14}$');
ALTER TABLE equipamentos ADD CONSTRAINT ck_estado_fisico CHECK ("estadoFisico" BETWEEN 0 AND 6);
ALTER TABLE equipamentos ADD CONSTRAINT ck_peso_positivo CHECK ("pesoQuilogramas" > 0);
ALTER TABLE equipamentos ADD CONSTRAINT ck_posicao_positiva CHECK ("posicaoNoLote" > 0);
ALTER TABLE equipamentos ADD CONSTRAINT ck_ano CHECK ("anoFabricacao" BETWEEN 1950 AND 2100);
ALTER TABLE contratos ADD CONSTRAINT ck_vigencia CHECK ("dataVencimento" > "dataAssinatura");
ALTER TABLE contratos ADD CONSTRAINT ck_valor CHECK ("valorMensal" >= 0);

CREATE FUNCTION bloquear_alteracao_movimentacao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Movimentacao e imutavel' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER trg_mov_imutavel BEFORE UPDATE OR DELETE ON movimentacoes
FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao_movimentacao();

CREATE FUNCTION validar_data_lote() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."dataEntrada" > CURRENT_TIMESTAMP + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Data de entrada futura' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lote_data BEFORE INSERT ON lotes FOR EACH ROW EXECUTE FUNCTION validar_data_lote();

CREATE FUNCTION validar_desmonte() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE estado "StatusLote";
BEGIN
  IF NEW."statusRastreamento" IN ('AGUARDANDO_DESMONTE', 'EM_DESMONTE') THEN
    SELECT "statusProcessamento" INTO estado FROM lotes WHERE id = NEW."loteId" FOR SHARE;
    IF estado IS DISTINCT FROM 'TRIAGEM_CONCLUIDA' THEN
      RAISE EXCEPTION 'Desmonte exige triagem concluida' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_equipamento_desmonte BEFORE INSERT OR UPDATE OF "statusRastreamento", "loteId" ON equipamentos
FOR EACH ROW EXECUTE FUNCTION validar_desmonte();

-- Preserva o mesmo invariante se o lote mudar enquanto há desmonte pendente.
CREATE FUNCTION validar_saida_triagem() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."statusProcessamento" <> 'TRIAGEM_CONCLUIDA' AND EXISTS (
    SELECT 1 FROM equipamentos WHERE "loteId" = NEW.id
    AND "statusRastreamento" IN ('AGUARDANDO_DESMONTE', 'EM_DESMONTE')
  ) THEN
    RAISE EXCEPTION 'Lote possui equipamentos em desmonte' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_saida_triagem BEFORE UPDATE OF "statusProcessamento" ON lotes
FOR EACH ROW EXECUTE FUNCTION validar_saida_triagem();
