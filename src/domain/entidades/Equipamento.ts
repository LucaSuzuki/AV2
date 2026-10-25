

import { EstadoFisico, StatusRastreamento, TipoEquipamento } from '../enums';
import { Movimentacao } from './Movimentacao';
import { validarEstadoFisico } from '../regras/transicoes';

export class Equipamento {
  id: string;
  versao: number;
  codigoBarrasInterno: string;
  tipo: TipoEquipamento;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  estadoFisico: EstadoFisico;
  pesoQuilogramas: number;
  loteId: string;
  posicaoNoLote: number;
  statusRastreamento: StatusRastreamento;
  historicoMovimentacao: Movimentacao[];

  constructor(dados: Partial<Equipamento> & { codigoBarrasInterno: string; tipo: TipoEquipamento; marca: string; modelo: string; anoFabricacao: number; estadoFisico: EstadoFisico; pesoQuilogramas: number; loteId: string; posicaoNoLote: number; statusRastreamento: StatusRastreamento; }) {
    this.id = dados.id ?? '';
    this.versao = dados.versao ?? 1;
    this.codigoBarrasInterno = dados.codigoBarrasInterno;
    this.tipo = dados.tipo;
    this.marca = dados.marca;
    this.modelo = dados.modelo;
    this.anoFabricacao = dados.anoFabricacao;
    this.estadoFisico = dados.estadoFisico;
    this.pesoQuilogramas = dados.pesoQuilogramas;
    this.loteId = dados.loteId;
    this.posicaoNoLote = dados.posicaoNoLote;
    this.statusRastreamento = dados.statusRastreamento;
    this.historicoMovimentacao = dados.historicoMovimentacao ?? [];
  }

  atualizarStatus(novoEstado: EstadoFisico, justificativa: string, responsavel: string): void {
    validarEstadoFisico(this.estadoFisico, novoEstado, justificativa);
    const anterior = this.estadoFisico;
    this.estadoFisico = novoEstado;
    this.historicoMovimentacao.push(new Movimentacao({
      equipamentoId: this.id,
      origem: String(anterior),
      destino: String(novoEstado),
      responsavel,
      observacao: justificativa || 'Atualização de estado',
    }));
  }

  registrarMovimentacao(destino: string, responsavel: string): void {
    this.historicoMovimentacao.push(new Movimentacao({
      equipamentoId: this.id,
      origem: this.statusRastreamento,
      destino,
      responsavel,
      observacao: `Movimentação para ${destino}`,
    }));
  }

  calcularDepreciacao(): number {
    const base = 100;
    const idade = Math.max(0, new Date().getFullYear() - this.anoFabricacao);
    const perda = idade * 5 + (this.estadoFisico * 4);
    return Math.min(base, Math.max(0, base - perda));
  }
}
