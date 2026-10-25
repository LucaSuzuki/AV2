import { RegraNegocioError } from '../../shared/errors';

export class Contrato {
  id: string;
  versao: number;
  organizacaoId: string;
  dataAssinatura: Date;
  dataVencimento: Date;
  clausulas: string[];
  valorMensal: number;
  renovacaoAutomatica: boolean;

  constructor(dados: Partial<Contrato> & { organizacaoId: string; dataAssinatura: Date; dataVencimento: Date; valorMensal: number; }) {
    this.id = dados.id ?? '';
    this.versao = dados.versao ?? 1;
    this.organizacaoId = dados.organizacaoId;
    this.dataAssinatura = dados.dataAssinatura;
    this.dataVencimento = dados.dataVencimento;
    this.clausulas = dados.clausulas ?? [];
    this.valorMensal = dados.valorMensal;
    this.renovacaoAutomatica = dados.renovacaoAutomatica ?? true;
  }

  estaVigente(): boolean {
    return new Date() <= this.dataVencimento;
  }

  renovar(novoVencimento: Date): void {
    if (novoVencimento <= this.dataVencimento) throw new RegraNegocioError('Renovação deve aumentar a data de vencimento.');
    this.dataVencimento = novoVencimento;
  }
}
