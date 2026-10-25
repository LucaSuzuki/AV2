import { BaseRepository } from '../../shared/base.repository';
import { PrismaClientOuTx } from '../../shared/tipos';
import { mapearLote } from '../lotes/lote.repository';
import { StatusLote } from '../../generated/prisma/client';

export class RelatorioRepository extends BaseRepository {
  async porOrganizacao(organizacaoId: string, inicio: Date, fim: Date, db: PrismaClientOuTx = this.prisma) {
    return (await db.lote.findMany({ where: { organizacaoId, dataEntrada: { gte: inicio, lte: fim } }, include: { equipamentos: true }, orderBy: { dataEntrada: 'asc' } })).map(mapearLote);
  }
  async porStatus(status: StatusLote, db: PrismaClientOuTx = this.prisma) { return (await db.lote.findMany({ where: { statusProcessamento: status }, include: { equipamentos: true }, orderBy: { id: 'asc' } })).map(mapearLote); }
  async financeiro(inicio: Date, fim: Date, db: PrismaClientOuTx = this.prisma) { const r = await db.contrato.aggregate({ where: { dataAssinatura: { gte: inicio, lte: fim } }, _sum: { valorMensal: true } }); return r._sum.valorMensal?.toNumber() ?? 0; }
  async resumo(inicio: Date, fim: Date, db: PrismaClientOuTx = this.prisma) {
    const [totalLotes, totalOrganizacoes, valorFinanceiro] = await Promise.all([
      db.lote.count({ where: { dataEntrada: { gte: inicio, lte: fim } } }),
      db.organizacao.count({ where: { ativo: true } }), this.financeiro(inicio, fim, db),
    ]);
    return { totalLotes, totalOrganizacoes, valorFinanceiro };
  }
}
