import { RelatorioRepository } from './relatorio.repository';
import { OrganizacaoRepository } from '../organizacoes/organizacao.repository';
import { NaoEncontradoError, RegraNegocioError } from '../../shared/errors';
import { StatusLote } from '../../generated/prisma/client';

export interface Periodo { inicio: string; fim: string; }
export class RelatorioService {
  constructor(private repo: RelatorioRepository, private orgs: OrganizacaoRepository) {}
  private periodo(p: Periodo): [Date, Date] { const inicio = new Date(p.inicio), fim = new Date(p.fim); if (inicio > fim) throw new RegraNegocioError('Período invertido.'); return [inicio, fim]; }
  async porOrganizacao(id: string, p: Periodo) { if (!await this.orgs.porId(id)) throw new NaoEncontradoError(); return this.repo.porOrganizacao(id, ...this.periodo(p)); }
  porStatus(status: StatusLote) { return this.repo.porStatus(status); }
  async financeiro(p: Periodo) { return { valorFinanceiro: await this.repo.financeiro(...this.periodo(p)) }; }
  resumo(p: Periodo) { return this.repo.resumo(...this.periodo(p)); }
}
