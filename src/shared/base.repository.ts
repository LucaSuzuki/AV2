import { Prisma, PrismaClient } from '../generated/prisma/client';
import { PrismaClientOuTx } from './tipos';
import { ConflitoError, NaoEncontradoError } from './errors';

export class BaseRepository {
  constructor(protected prisma: PrismaClient) {}
  transacao<T>(executar: (db: Prisma.TransactionClient) => Promise<T>, serializavel = false): Promise<T> {
    return this.prisma.$transaction(executar, { isolationLevel: serializavel ? 'Serializable' : 'ReadCommitted', timeout: 15000 });
  }
  protected async conferirUpdate(count: number, existe: () => Promise<unknown>) {
    if (count !== 0) return;
    if (!await existe()) throw new NaoEncontradoError();
    throw new ConflitoError('Versão defasada. Recarregue o registro.');
  }
  async saudavel(db: PrismaClientOuTx = this.prisma) { await db.$queryRaw`SELECT 1`; }
}
