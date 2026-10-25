export enum PapelUsuario {
  ADMINISTRADOR = 'ADMINISTRADOR',
  OPERADOR_CADASTRO = 'OPERADOR_CADASTRO',
  GESTOR_ALMOXARIFADO = 'GESTOR_ALMOXARIFADO',
  AUDITORIA = 'AUDITORIA',
}

export enum StatusLote {
  RECEBIDO = 'RECEBIDO',
  EM_TRIAGEM = 'EM_TRIAGEM',
  TRIAGEM_CONCLUIDA = 'TRIAGEM_CONCLUIDA',
  ENCAMINHADO = 'ENCAMINHADO',
  FINALIZADO = 'FINALIZADO',
}

export enum TipoEquipamento {
  COMPUTADOR_MESA = 'COMPUTADOR_MESA',
  NOTEBOOK = 'NOTEBOOK',
  MONITOR = 'MONITOR',
  IMPRESSORA = 'IMPRESSORA',
  SERVIDOR = 'SERVIDOR',
  ROTEADOR = 'ROTEADOR',
  CABO_ESTRUTURADO = 'CABO_ESTRUTURADO',
  FONTE_ALIMENTACAO = 'FONTE_ALIMENTACAO',
}

export enum EstadoFisico {
  NOVO = 0,
  BOM_ESTADO = 1,
  USADO_LEVE = 2,
  USADO_MODERADO = 3,
  DANIFICADO_LEVE = 4,
  DANIFICADO_GRAVE = 5,
  INSERVIVEL = 6,
}

export const ORDEM_ESTADO_FISICO: EstadoFisico[] = [
  EstadoFisico.NOVO,
  EstadoFisico.BOM_ESTADO,
  EstadoFisico.USADO_LEVE,
  EstadoFisico.USADO_MODERADO,
  EstadoFisico.DANIFICADO_LEVE,
  EstadoFisico.DANIFICADO_GRAVE,
  EstadoFisico.INSERVIVEL,
];

export enum StatusRastreamento {
  AGUARDANDO_TRIAGEM = 'AGUARDANDO_TRIAGEM',
  EM_TRIAGEM = 'EM_TRIAGEM',
  AGUARDANDO_DESMONTE = 'AGUARDANDO_DESMONTE',
  EM_DESMONTE = 'EM_DESMONTE',
  PECAS_REAPROVEITADAS = 'PECAS_REAPROVEITADAS',
  MATERIAL_RECICLAVEL = 'MATERIAL_RECICLAVEL',
  DESCARTE_SEGURO = 'DESCARTE_SEGURO',
  BAIXA_DEFINITIVA = 'BAIXA_DEFINITIVA',
}

export interface Autenticavel {
  autenticar(usuario: string, senha: string): Promise<boolean>;
  renovarToken(token: string): Promise<string>;
}

export type SeveridadeOperacao = 'INFO' | 'SUCESSO' | 'AVISO' | 'ERRO';

export interface ResultadoOperacao {
  sucesso: boolean;
  mensagem: string;
  severidade: SeveridadeOperacao;
  codigo?: number;
}

export interface HistoricoCompleto {
  equipamento: any;
  movimentacoes: any[];
  totalMovimentacoes: number;
}

export interface PeriodoConsulta {
  inicio: Date;
  fim: Date;
}
