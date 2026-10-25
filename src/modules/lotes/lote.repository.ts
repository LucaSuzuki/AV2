import { Prisma } from '../../generated/prisma/client';
import { BaseRepository } from '../../shared/base.repository';
import { PrismaClientOuTx } from '../../shared/tipos';
import { paginar, pagina, Paginacao } from '../../shared/pagination';
import { Lote } from '../../domain/entidades/Lote';
import { StatusLote } from '../../domain/enums';
import { mapearEquipamento } from '../equipamentos/equipamento.repository';

export interface FiltroLote extends Paginacao { organizacaoId?: string; status?: Prisma.LoteWhereInput['statusProcessamento']; dataInicio?: string; dataFim?: string; }
type LinhaLote = Prisma.LoteGetPayload<{}> & { equipamentos?: Prisma.EquipamentoGetPayload<{}>[] };
export function mapearLote(l: LinhaLote) { return new Lote({ ...l, statusProcessamento: l.statusProcessamento as StatusLote, equipamentos: l.equipamentos?.map(mapearEquipamento) ?? [] }); }
export class LoteRepository extends BaseRepository {
  async porId(id: string, db: PrismaClientOuTx = this.prisma) { const l = await db.lote.findUnique({ where: { id }, include: { equipamentos: { orderBy: { posicaoNoLote: 'asc' } } } }); return l ? mapearLote(l) : null; }
  async criar(data: Prisma.LoteUncheckedCreateInput, db: PrismaClientOuTx = this.prisma) { return mapearLote(await db.lote.create({ data })); }
  async atualizar(id: string, versao: number, data: Prisma.LoteUpdateManyMutationInput, db: PrismaClientOuTx = this.prisma) {
    const r = await db.lote.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } });
    await this.conferirUpdate(r.count, () => this.porId(id, db)); return (await this.porId(id, db))!;
  }
  async listar(query: FiltroLote, db: PrismaClientOuTx = this.prisma) {
    const where: Prisma.LoteWhereInput = { organizacaoId: query.organizacaoId, statusProcessamento: query.status, dataEntrada: { gte: query.dataInicio ? new Date(query.dataInicio) : undefined, lte: query.dataFim ? new Date(query.dataFim) : undefined } };
    const { skip, take } = paginar(query);
    const [items, total] = await Promise.all([db.lote.findMany({ where, skip, take, orderBy: [{ dataEntrada: 'desc' }, { id: 'asc' }] }), db.lote.count({ where })]);
    return pagina(items, total, query);
  }
}
