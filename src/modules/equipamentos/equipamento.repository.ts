import { Prisma } from '../../generated/prisma/client';
import { BaseRepository } from '../../shared/base.repository';
import { PrismaClientOuTx } from '../../shared/tipos';
import { paginar, pagina, Paginacao } from '../../shared/pagination';
import { Equipamento } from '../../domain/entidades/Equipamento';
import { Movimentacao } from '../../domain/entidades/Movimentacao';
import { TipoEquipamento, StatusRastreamento } from '../../domain/enums';

type Linha = Prisma.EquipamentoGetPayload<{}> & { movimentacoes?: Prisma.MovimentacaoGetPayload<{}>[] };
export function mapearEquipamento(e: Linha) { return new Equipamento({ ...e, tipo: e.tipo as TipoEquipamento, statusRastreamento: e.statusRastreamento as StatusRastreamento, pesoQuilogramas: e.pesoQuilogramas.toNumber(), historicoMovimentacao: e.movimentacoes?.map(m => new Movimentacao(m)) ?? [] }); }
export interface FiltroEquipamento extends Paginacao { loteId?: string; tipo?: Prisma.EquipamentoWhereInput['tipo']; estadoFisico?: number; statusRastreamento?: Prisma.EquipamentoWhereInput['statusRastreamento']; }
export class EquipamentoRepository extends BaseRepository {
  async porId(id: string, db: PrismaClientOuTx = this.prisma) { const e = await db.equipamento.findUnique({ where: { id }, include: { movimentacoes: { orderBy: [{ dataHora: 'asc' }, { id: 'asc' }] } } }); return e ? mapearEquipamento(e) : null; }
  async criar(data: Prisma.EquipamentoUncheckedCreateInput, db: PrismaClientOuTx = this.prisma) { return mapearEquipamento(await db.equipamento.create({ data })); }
  movimentar(data: Prisma.MovimentacaoUncheckedCreateInput, db: PrismaClientOuTx = this.prisma) { return db.movimentacao.create({ data }); }
  async atualizar(id: string, versao: number, data: Prisma.EquipamentoUpdateManyMutationInput, db: PrismaClientOuTx = this.prisma) {
    const r = await db.equipamento.updateMany({ where: { id, versao }, data: { ...data, versao: { increment: 1 } } });
    await this.conferirUpdate(r.count, () => this.porId(id, db)); return (await this.porId(id, db))!;
  }
  async listar(query: FiltroEquipamento, db: PrismaClientOuTx = this.prisma) {
    const where: Prisma.EquipamentoWhereInput = { loteId: query.loteId, tipo: query.tipo, estadoFisico: query.estadoFisico, statusRastreamento: query.statusRastreamento };
    const { skip, take } = paginar(query);
    const [rows, total] = await Promise.all([db.equipamento.findMany({ where, skip, take, orderBy: { id: 'asc' } }), db.equipamento.count({ where })]);
    return pagina(rows.map(mapearEquipamento), total, query);
  }
}
