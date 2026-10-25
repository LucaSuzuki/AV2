import { objeto, texto, uuid, dataHora, versao, paginacao } from '../../shared/schemas';
export interface OrganizacaoInput { razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string; }
export interface ContratoInput { dataAssinatura: string; dataVencimento: string; clausulas: string[]; valorMensal: number; renovacaoAutomatica: boolean; versao?: number; }
export const organizacaoCampos = { razaoSocial: texto, cnpj: { type: 'string', minLength: 1, maxLength: 32 }, inscricaoEstadual: texto, enderecoCompleto: texto, telefone: texto, email: { ...texto, format: 'email' } };
export const contratoCampos = { dataAssinatura: dataHora, dataVencimento: dataHora, clausulas: { type: 'array', maxItems: 100, items: texto }, valorMensal: { type: 'number', minimum: 0, maximum: 9999999999.99, multipleOf: 0.01 }, renovacaoAutomatica: { type: 'boolean', default: true } };
export const contratoResposta = objeto({ id: uuid, organizacaoId: uuid, ...contratoCampos, versao, vigente: { type: 'boolean' } });
export const organizacaoResposta = objeto({ id: uuid, ...organizacaoCampos, dataCadastro: dataHora, ativo: { type: 'boolean' }, versao, contrato: { anyOf: [contratoResposta, { type: 'null' }] } });
export const criarOrganizacaoSchema = objeto(organizacaoCampos, Object.keys(organizacaoCampos));
export const atualizarOrganizacaoSchema = objeto({ ...organizacaoCampos, versao }, ['versao']);
export const contratoSchema = objeto({ ...contratoCampos, versao }, ['dataAssinatura', 'dataVencimento', 'clausulas', 'valorMensal']);
export const organizacaoQuery = objeto({ ...paginacao, ativo: { type: 'boolean' }, q: texto });
