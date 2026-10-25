import { Prisma } from '../../generated/prisma/client';
import { BaseRepository } from '../../shared/base.repository';
import { PrismaClientOuTx } from '../../shared/tipos';
import { paginar, Paginacao, pagina } from '../../shared/pagination';

export interface FiltroJournal extends Paginacao { entidade?: string; usuario?: string; inicio?: string; fim?: string; }
export class AuditoriaRepository extends BaseRepository {
  registrar(data: Prisma.JournalTransacaoCreateInput, db: PrismaClientOuTx = this.prisma) { return db.journalTransacao.create({ data }); }
  async listar(query: FiltroJournal, db: PrismaClientOuTx = this.prisma) {
    const where: Prisma.JournalTransacaoWhereInput = { entidade: query.entidade, usuarioResponsavel: query.usuario,
      timestamp: { gte: query.inicio ? new Date(query.inicio) : undefined, lte: query.fim ? new Date(query.fim) : undefined } };
    const { skip, take } = paginar(query);
    const [items, total] = await Promise.all([db.journalTransacao.findMany({ where, skip, take, orderBy: [{ timestamp: 'desc' }, { id: 'asc' }] }), db.journalTransacao.count({ where })]);
    return pagina(items, total, query);
  }
}
