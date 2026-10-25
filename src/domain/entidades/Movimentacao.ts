

export class Movimentacao {
  id: string;
  versao: number;
  equipamentoId: string;
  dataHora: Date;
  origem: string;
  destino: string;
  responsavel: string;
  observacao: string;

  constructor(dados: Partial<Movimentacao> & { equipamentoId: string; origem: string; destino: string; responsavel: string; observacao?: string; }) {
    this.id = dados.id ?? '';
    this.versao = dados.versao ?? 1;
    this.equipamentoId = dados.equipamentoId;
    this.dataHora = dados.dataHora ?? new Date();
    this.origem = dados.origem;
    this.destino = dados.destino;
    this.responsavel = dados.responsavel;
    this.observacao = dados.observacao ?? '';
  }
}
