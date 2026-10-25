import { hash } from 'bcryptjs';
import { PapelUsuario } from '../../generated/prisma/client';
import { UsuarioRepository } from './usuario.repository';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Ator } from '../../shared/tipos';
import { NaoEncontradoError, RegraNegocioError, conferirVersao } from '../../shared/errors';
import { Paginacao } from '../../shared/pagination';

export class UsuarioService {
  constructor(private repo: UsuarioRepository, private auditoria: AuditoriaService, private custo: number) {}
  listar(query: Paginacao) { return this.repo.listar(query); }
  async obter(id: string) { const u = await this.repo.porId(id); if (!u) throw new NaoEncontradoError(); return u; }
  async criar(dados: { usuario: string; senha: string; papel: PapelUsuario }, ator: Ator) {
    if (Buffer.byteLength(dados.senha, 'utf8') > 72) throw new RegraNegocioError('Senha ultrapassa 72 bytes UTF-8.');
    const hashSenha = await hash(dados.senha, this.custo);
    return this.repo.transacao(async db => {
      const u = await this.repo.criar({ usuario: dados.usuario, papel: dados.papel, hashSenha }, db);
      await this.auditoria.registrar('CREATE', 'Usuario', u.id, undefined, u, ator.usuario, db);
      return u;
    });
  }
  atualizar(id: string, dados: { versao: number; ativo?: boolean; papel?: PapelUsuario }, ator: Ator) {
    return this.repo.transacao(async db => {
      const antes = await this.repo.porId(id, db);
      if (!antes) throw new NaoEncontradoError();
      conferirVersao(antes.versao, dados.versao);
      const removeAdmin = antes.ativo && antes.papel === 'ADMINISTRADOR' && (dados.ativo === false || (dados.papel !== undefined && dados.papel !== 'ADMINISTRADOR'));
      if (id === ator.sub && dados.ativo === false) throw new RegraNegocioError('Administrador não pode excluir a si próprio.');
      if (removeAdmin && await this.repo.contarAdmins(db) <= 1) throw new RegraNegocioError('Não é permitido excluir o último administrador.');
      const { versao, ...campos } = dados;
      const depois = await this.repo.atualizar(id, versao, campos, db);
      await this.auditoria.registrar(dados.ativo === false ? 'DELETE' : 'UPDATE', 'Usuario', id, antes, depois, ator.usuario, db);
      return depois;
    }, true);
  }
  async excluir(id: string, versao: number, ator: Ator) {
    if (id === ator.sub) throw new RegraNegocioError('Administrador não pode excluir a si próprio.');
    await this.atualizar(id, { versao, ativo: false }, ator);
  }
}
