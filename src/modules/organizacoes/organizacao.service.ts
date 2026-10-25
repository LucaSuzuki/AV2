import { ValidadorCNPJ } from '../../domain/validators/ValidadorCNPJ';
import { OrganizacaoRepository, FiltroOrganizacao } from './organizacao.repository';
import { OrganizacaoInput, ContratoInput } from './organizacao.schemas';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Ator } from '../../shared/tipos';
import { ConflitoError, NaoEncontradoError, RegraNegocioError, conferirVersao } from '../../shared/errors';

export class OrganizacaoService {
  constructor(private repo: OrganizacaoRepository, private auditoria: AuditoriaService) {}
  listar(query: FiltroOrganizacao) { return this.repo.listar(query); }
  async obter(id: string) { const o = await this.repo.porId(id); if (!o) throw new NaoEncontradoError(); return o; }
  private cnpj(cnpj: string) { const v = new ValidadorCNPJ(); if (!v.validar(cnpj)) throw new RegraNegocioError(v.obterMensagemErro()); return cnpj.replace(/\D/g, ''); }
  criar(dados: OrganizacaoInput, ator: Ator) {
    const cnpj = this.cnpj(dados.cnpj);
    return this.repo.transacao(async db => { const o = await this.repo.criar({ ...dados, cnpj }, db); await this.auditoria.registrar('CREATE', 'Organizacao', o.id, undefined, o, ator.usuario, db); return o; });
  }
  atualizar(id: string, dados: Partial<OrganizacaoInput> & { versao: number }, ator: Ator) {
    const { versao, ...campos } = dados;
    if (campos.cnpj !== undefined) campos.cnpj = this.cnpj(campos.cnpj);
    return this.repo.transacao(async db => {
      const antes = await this.repo.porId(id, db); if (!antes) throw new NaoEncontradoError();
      const o = await this.repo.atualizar(id, versao, campos, db);
      await this.auditoria.registrar('UPDATE', 'Organizacao', id, antes, o, ator.usuario, db); return o;
    });
  }
  desativar(id: string, versao: number, ator: Ator) {
    return this.repo.transacao(async db => { const antes = await this.repo.porId(id, db); if (!antes) throw new NaoEncontradoError(); const o = await this.repo.atualizar(id, versao, { ativo: false }, db); await this.auditoria.registrar('DEACTIVATE', 'Organizacao', id, antes, o, ator.usuario, db); return o; }, true);
  }
  async obterContrato(id: string) { await this.obter(id); const c = await this.repo.contrato(id); if (!c) throw new NaoEncontradoError('Organização sem contrato.'); return { ...c, vigente: c.estaVigente() }; }
  salvarContrato(id: string, dados: ContratoInput, ator: Ator) {
    const { versao, ...campos } = dados;
    const dataAssinatura = new Date(campos.dataAssinatura), dataVencimento = new Date(campos.dataVencimento);
    if (dataVencimento <= dataAssinatura) throw new RegraNegocioError('Vencimento deve ser posterior à assinatura.');
    return this.repo.transacao(async db => {
      const org = await this.repo.porId(id, db); if (!org) throw new NaoEncontradoError();
      const antes = await this.repo.contrato(id, db);
      if (antes && !versao) throw new ConflitoError('Informe a versão do contrato existente.');
      const data = { ...campos, dataAssinatura, dataVencimento };
      const depois = antes ? await this.repo.atualizarContrato(antes.id, versao!, data, db) : await this.repo.criarContrato({ ...data, organizacaoId: id }, db);
      await this.auditoria.registrar(antes ? 'UPDATE' : 'CREATE', 'Contrato', depois.id, antes, depois, ator.usuario, db);
      return { ...depois, vigente: depois.estaVigente() };
    });
  }
  renovarContrato(id: string, dados: { novoVencimento: string; versao: number }, ator: Ator) {
    return this.repo.transacao(async db => {
      const c = await this.repo.contrato(id, db); if (!c) throw new NaoEncontradoError();
      conferirVersao(c.versao, dados.versao);
      const antes = { ...c }; c.renovar(new Date(dados.novoVencimento));
      const depois = await this.repo.atualizarContrato(c.id, dados.versao, { dataVencimento: c.dataVencimento }, db);
      await this.auditoria.registrar('RENEW', 'Contrato', c.id, antes, depois, ator.usuario, db);
      return { ...depois, vigente: depois.estaVigente() };
    });
  }
}
