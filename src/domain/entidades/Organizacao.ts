

import { Contrato } from './Contrato';

export class Organizacao {
  id: string;
  versao: number;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  enderecoCompleto: string;
  telefone: string;
  email: string;
  dataCadastro: Date;
  ativo: boolean;
  contratoVigente: Contrato | null;

  constructor(dados: Partial<Organizacao> & { razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string; }) {
    this.id = dados.id ?? '';
    this.versao = dados.versao ?? 1;
    this.razaoSocial = dados.razaoSocial;
    this.cnpj = (dados.cnpj ?? '').replace(/\D/g, '');
    this.inscricaoEstadual = dados.inscricaoEstadual;
    this.enderecoCompleto = dados.enderecoCompleto;
    this.telefone = dados.telefone;
    this.email = dados.email;
    this.dataCadastro = dados.dataCadastro ?? new Date();
    this.ativo = dados.ativo ?? true;
    this.contratoVigente = dados.contratoVigente ?? null;
  }

  alterarEndereco(novoEndereco: string): void {
    this.enderecoCompleto = novoEndereco;
  }

  desativar(): void {
    this.ativo = false;
  }
}
