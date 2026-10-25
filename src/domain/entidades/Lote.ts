

import { Equipamento } from './Equipamento';
import { StatusLote } from '../enums';

export class Lote {
  id: string;
  versao: number;
  dataEntrada: Date;
  organizacaoId: string;
  notaFiscal: string;
  transportadora: string;
  equipamentos: Equipamento[];
  statusProcessamento: StatusLote;
  observacoes: string;

  constructor(dados: Partial<Lote> & { dataEntrada: Date; organizacaoId: string; notaFiscal: string; transportadora: string; }) {
    this.id = dados.id ?? '';
    this.versao = dados.versao ?? 1;
    this.dataEntrada = dados.dataEntrada;
    this.organizacaoId = dados.organizacaoId;
    this.notaFiscal = dados.notaFiscal;
    this.transportadora = dados.transportadora;
    this.equipamentos = dados.equipamentos ?? [];
    this.statusProcessamento = dados.statusProcessamento ?? StatusLote.RECEBIDO;
    this.observacoes = dados.observacoes ?? '';
  }

  adicionarEquipamento(equip: Equipamento): void {
    this.equipamentos.push(equip);
  }

  removerEquipamento(equipId: string): boolean {
    const index = this.equipamentos.findIndex((equip) => equip.id === equipId);
    if (index >= 0) {
      this.equipamentos.splice(index, 1);
      return true;
    }
    return false;
  }

  calcularPesoTotal(): number {
    return this.equipamentos.reduce((total, equip) => total + equip.pesoQuilogramas, 0);
  }

  gerarRelatorioTriagem(): string {
    return `Lote ${this.id}: ${this.equipamentos.length} equipamentos, status ${this.statusProcessamento}.`;
  }
}
