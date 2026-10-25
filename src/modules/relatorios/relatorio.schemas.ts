import { objeto, dataHora } from '../../shared/schemas';
export const periodoSchema = objeto({ inicio: dataHora, fim: dataHora }, ['inicio', 'fim']);
export const financeiroResposta = objeto({ valorFinanceiro: { type: 'number' } });
export const resumoResposta = objeto({ totalLotes: { type: 'integer' }, totalOrganizacoes: { type: 'integer' }, valorFinanceiro: { type: 'number' } });
