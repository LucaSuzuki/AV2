import { compare, hash } from 'bcryptjs';
import { UsuarioRepository } from '../usuarios/usuario.repository';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NaoAutorizadoError, RegraNegocioError } from '../../shared/errors';
import { Ator } from '../../shared/tipos';
import { Autenticavel } from '../../domain/enums';

type Assinar = (ator: Ator) => string;
export class AuthService implements Autenticavel {
  private dummy: Promise<string>;
  constructor(private repo: UsuarioRepository, private auditoria: AuditoriaService, private custo: number, private assinar: Assinar, private verificar: (token: string) => Ator) { this.dummy = hash('comparacao-interna-aleatoria', custo); }
  async autenticar(usuario: string, senha: string): Promise<boolean> {
    const u = await this.repo.porLogin(usuario);
    const ok = await compare(senha, u?.hashSenha ?? await this.dummy);
    return Boolean(ok && u?.ativo && Buffer.byteLength(senha, 'utf8') <= 72);
  }
  private emitir(ator: Ator) { return { token: this.assinar(ator), expiraEm: new Date(Date.now() + 30 * 60000).toISOString(), usuario: { id: ator.sub, usuario: ator.usuario, papel: ator.papel } }; }
  async login(usuario: string, senha: string) {
    const u = await this.repo.porLogin(usuario);
    const ok = await compare(senha, u?.hashSenha ?? await this.dummy);
    if (!ok || !u?.ativo || Buffer.byteLength(senha, 'utf8') > 72) throw new NaoAutorizadoError();
    await this.repo.transacao(async db => {
      const depois = await this.repo.atualizar(u.id, u.versao, { ultimoAcesso: new Date() }, db);
      await this.auditoria.registrar('LOGIN', 'Usuario', u.id, undefined, depois, u.usuario, db);
    });
    return this.emitir({ sub: u.id, usuario: u.usuario, papel: u.papel });
  }
  async renovar(ator: Ator) {
    const u = await this.repo.porId(ator.sub);
    if (!u?.ativo) throw new NaoAutorizadoError();
    await this.repo.transacao(db => this.auditoria.registrar('RENEW', 'Usuario', u.id, undefined, undefined, u.usuario, db));
    return this.emitir({ sub: u.id, usuario: u.usuario, papel: u.papel });
  }
  async renovarToken(token: string): Promise<string> { return (await this.renovar(this.verificar(token))).token; }
  async logout(ator: Ator) { await this.repo.transacao(db => this.auditoria.registrar('LOGOUT', 'Usuario', ator.sub, undefined, undefined, ator.usuario, db)); }
  async alterarSenha(dados: { senhaAtual: string; senhaNova: string }, ator: Ator) {
    if (Buffer.byteLength(dados.senhaNova, 'utf8') > 72) throw new RegraNegocioError('Senha ultrapassa 72 bytes UTF-8.');
    const u = await this.repo.credencial(ator.sub);
    if (!u?.ativo || !await compare(dados.senhaAtual, u.hashSenha)) throw new NaoAutorizadoError();
    const hashSenha = await hash(dados.senhaNova, this.custo);
    await this.repo.transacao(async db => {
      await this.repo.atualizar(u.id, u.versao, { hashSenha }, db);
      await this.auditoria.registrar('PASSWORD_CHANGE', 'Usuario', u.id, undefined, undefined, ator.usuario, db);
    });
  }
}
