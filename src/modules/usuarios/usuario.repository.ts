import { Prisma } from '../../generated/prisma/client';
import { BaseRepository } from '../../shared/base.repository';
import { PrismaClientOuTx } from '../../shared/tipos';
import { paginar, pagina, Paginacao } from '../../shared/pagination';

export const usuarioPublico = { id: true, usuario: true, papel: true, ativo: true, ultimoAcesso: true, criadoEm: true, atualizadoEm: true, versao: true } as const;
export class UsuarioRepository extends BaseRepository {
  porLogin(usuario: string, db: PrismaClientOuTx = this.prisma) { return db.usuario.findUnique({ where: { usuario } }); }
  porId(id: string, db: PrismaClientOuTx = this.prisma) { return db.usuario.findUnique({ where: { id }, select: usuarioPublico }); }
  credencial(id: string, db: PrismaClientOuTx = this.prisma) { return db.usuario.findUnique({ where: { id } }); }
  contarAdmins(db: PrismaClientOuTx = this.prisma) { return db.usuario.count({ where: { papel: 'ADMINISTRADOR', ativo: true } }); }
  criar(data: Prisma.UsuarioCreateInput, db: PrismaClientOuTx = this.prisma) { return db.usuario.create({ data, select: usuarioPublico }); }
  async atualizar(id: string, versao: number, data: Prisma.UsuarioUpdateManyMutationInput, db: PrismaClientOuTx = this.prisma) {
    const resultado = await db.usuario.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } });
    await this.conferirUpdate(resultado.count, () => this.porId(id, db));
    return (await this.porId(id, db))!;
  }
  async listar(query: Paginacao, db: PrismaClientOuTx = this.prisma) {
    const { skip, take } = paginar(query);
    const [items, total] = await Promise.all([db.usuario.findMany({ select: usuarioPublico, skip, take, orderBy: { usuario: 'asc' } }), db.usuario.count()]);
    return pagina(items, total, query);
  }
}
