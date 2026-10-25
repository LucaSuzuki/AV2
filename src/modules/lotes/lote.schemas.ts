import { StatusLote } from '../../generated/prisma/client';
import { objeto, texto, uuid, dataHora, versao, paginacao } from '../../shared/schemas';
import { equipamentoSchema, equipamentoResposta, EquipamentoInput } from '../equipamentos/equipamento.schemas';
export interface LoteInput { organizacaoId: string; dataEntrada?: string; notaFiscal: string; transportadora: string; observacoes?: string; equipamentos?: EquipamentoInput[]; }
export const statusLoteSchema = { type: 'string', enum: Object.values(StatusLote) };
export const loteCampos = { organizacaoId: uuid, dataEntrada: dataHora, notaFiscal: texto, transportadora: texto, observacoes: { type: 'string', maxLength: 4000 } };
export const loteSchema = objeto({ ...loteCampos, equipamentos: { type: 'array', maxItems: 500, items: equipamentoSchema } }, ['organizacaoId', 'notaFiscal', 'transportadora']);
export const loteResposta = objeto({ ...loteCampos, id: uuid, statusProcessamento: statusLoteSchema, versao, equipamentos: { type: 'array', items: equipamentoResposta }, pesoTotal: { type: 'number' } });
export const loteQuery = objeto({ ...paginacao, organizacaoId: uuid, status: statusLoteSchema, dataInicio: dataHora, dataFim: dataHora });
