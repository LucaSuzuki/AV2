import { objeto, texto, uuid, versao, paginacao, dataHora } from '../../shared/schemas';
import { TipoEquipamento, StatusRastreamento } from '../../generated/prisma/client';
export interface EquipamentoInput { codigoBarrasInterno: string; tipo: TipoEquipamento; marca: string; modelo: string; anoFabricacao: number; estadoFisico: number; pesoQuilogramas: number; posicaoNoLote: number; }
export const tipoSchema = { type: 'string', enum: Object.values(TipoEquipamento) };
export const statusRastreamentoSchema = { type: 'string', enum: Object.values(StatusRastreamento) };
export const estadoFisicoSchema = { type: 'integer', minimum: 0, maximum: 6 };
export const equipamentoCampos = { codigoBarrasInterno: texto, tipo: tipoSchema, marca: texto, modelo: texto, anoFabricacao: { type: 'integer', minimum: 1950, maximum: 2100 }, estadoFisico: estadoFisicoSchema, pesoQuilogramas: { type: 'number', exclusiveMinimum: 0, maximum: 9999999.999, multipleOf: 0.001 }, posicaoNoLote: versao };
export const equipamentoSchema = objeto(equipamentoCampos, Object.keys(equipamentoCampos));
export const movimentacaoResposta = objeto({ id: uuid, equipamentoId: uuid, dataHora, origem: texto, destino: texto, responsavel: texto, observacao: { type: 'string' }, versao });
export const equipamentoResposta = objeto({ ...equipamentoCampos, id: uuid, loteId: uuid, statusRastreamento: statusRastreamentoSchema, versao, depreciacao: { type: 'number' }, historicoMovimentacao: { type: 'array', items: movimentacaoResposta } });
export const rastreioResposta = objeto({ equipamento: equipamentoResposta, movimentacoes: { type: 'array', items: movimentacaoResposta }, totalMovimentacoes: { type: 'integer' } });
export const equipamentoQuery = objeto({ ...paginacao, loteId: uuid, tipo: tipoSchema, statusRastreamento: statusRastreamentoSchema, estadoFisico: estadoFisicoSchema });
