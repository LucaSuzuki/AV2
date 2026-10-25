import { RegraNegocioError } from '../../shared/errors';

export const transicoesLote: Record<string, readonly string[]> = {
  RECEBIDO: ['EM_TRIAGEM'], EM_TRIAGEM: ['TRIAGEM_CONCLUIDA'],
  TRIAGEM_CONCLUIDA: ['ENCAMINHADO'], ENCAMINHADO: ['FINALIZADO'], FINALIZADO: [],
};
export const transicoesRastreamento: Record<string, readonly string[]> = {
  AGUARDANDO_TRIAGEM: ['EM_TRIAGEM'], EM_TRIAGEM: ['AGUARDANDO_DESMONTE'],
  AGUARDANDO_DESMONTE: ['EM_DESMONTE'],
  EM_DESMONTE: ['PECAS_REAPROVEITADAS', 'MATERIAL_RECICLAVEL', 'DESCARTE_SEGURO'],
  PECAS_REAPROVEITADAS: ['BAIXA_DEFINITIVA'], MATERIAL_RECICLAVEL: ['BAIXA_DEFINITIVA'],
  DESCARTE_SEGURO: ['BAIXA_DEFINITIVA'], BAIXA_DEFINITIVA: [],
};
export function validarTransicao(mapa: Record<string, readonly string[]>, origem: string, destino: string) {
  if (!mapa[origem]?.includes(destino)) throw new RegraNegocioError(`Transição inválida: ${origem} -> ${destino}.`);
}
export function validarEstadoFisico(atual: number, novo: number, justificativa = '') {
  if (!Number.isInteger(novo) || novo < 0 || novo > 6) throw new RegraNegocioError('Estado físico deve estar entre 0 e 6.');
  if (Math.abs(novo - atual) >= 2 && !justificativa.trim()) throw new RegraNegocioError('Justificativa obrigatória para alteração de 2 ou mais categorias de estado físico.');
}
