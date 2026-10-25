import { Prisma } from '../../generated/prisma/client';
import { BaseRepository } from '../../shared/base.repository';
import { PrismaClientOuTx } from '../../shared/tipos';
import { paginar, pagina, Paginacao } from '../../shared/pagination';
import { Organizacao } from '../../domain/entidades/Organizacao';
import { Contrato } from '../../domain/entidades/Contrato';

type LinhaContrato = Prisma.ContratoGetPayload<{}>;
export function mapearContrato(c: LinhaContrato) { return new Contrato({ ...c, valorMensal: c.valorMensal.toNumber(), clausulas: c.clausulas as string[] }); }
export interface FiltroOrganizacao extends Paginacao { ativo?: boolean; q?: string; }
export class OrganizacaoRepository extends BaseRepository {
  private mapear(o: Prisma.OrganizacaoGetPayload<{ include: { contrato: true } }>) {
    const contrato = o.contrato ? mapearContrato(o.contrato) : null;
    return Object.assign(new Organizacao({ ...o, contratoVigente: contrato }), { contrato });
  }
  async porId(id: string, db: PrismaClientOuTx = this.prisma) { const o = await db.organizacao.findUnique({ where: { id }, include: { contrato: true } }); return o ? this.mapear(o) : null; }
  async criar(data: Prisma.OrganizacaoCreateInput, db: PrismaClientOuTx = this.prisma) { return this.mapear(await db.organizacao.create({ data, include: { contrato: true } })); }
  async atualizar(id: string, versao: number, data: Prisma.OrganizacaoUpdateManyMutationInput, db: PrismaClientOuTx = this.prisma) {
    const r = await db.organizacao.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } });
    await this.conferirUpdate(r.count, () => this.porId(id, db)); return (await this.porId(id, db))!;
  }
  async listar(query: FiltroOrganizacao, db: PrismaClientOuTx = this.prisma) {
    const where: Prisma.OrganizacaoWhereInput = { ativo: query.ativo, ...(query.q ? { OR: [{ razaoSocial: { contains: query.q, mode: 'insensitive' } }, { cnpj: { contains: query.q.replace(/\D/g, '') || query.q } }] } : {}) };
    const { skip, take } = paginar(query);
    const [items, total] = await Promise.all([db.organizacao.findMany({ where, skip, take, orderBy: { id: 'asc' }, select: { id: true, razaoSocial: true, cnpj: true, inscricaoEstadual: true, enderecoCompleto: true, telefone: true, email: true, dataCadastro: true, ativo: true, versao: true } }), db.organizacao.count({ where })]);
    return pagina(items, total, query);
  }
  async contrato(organizacaoId: string, db: PrismaClientOuTx = this.prisma) { const c = await db.contrato.findUnique({ where: { organizacaoId } }); return c ? mapearContrato(c) : null; }
  async criarContrato(data: Prisma.ContratoUncheckedCreateInput, db: PrismaClientOuTx = this.prisma) { return mapearContrato(await db.contrato.create({ data })); }
  async atualizarContrato(id: string, versao: number, data: Prisma.ContratoUpdateManyMutationInput, db: PrismaClientOuTx = this.prisma) {
    const r = await db.contrato.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } });
    await this.conferirUpdate(r.count, () => db.contrato.findUnique({ where: { id } }));
    return mapearContrato((await db.contrato.findUnique({ where: { id } }))!);
  }
}
