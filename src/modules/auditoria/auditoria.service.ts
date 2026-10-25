import { Prisma } from '../../generated/prisma/client';
import { PrismaClientOuTx } from '../../shared/tipos';
import { RegraNegocioError } from '../../shared/errors';
import { AuditoriaRepository, FiltroJournal } from './auditoria.repository';

export function sanitizar(dados: unknown): Prisma.InputJsonValue | undefined {
  if (dados === undefined || dados === null) return undefined;
  return JSON.parse(JSON.stringify(dados, (chave, valor) => /senha|password|token|secret/i.test(chave) ? undefined : valor));
}
export class AuditoriaService {
  constructor(private repo: AuditoriaRepository) {}
  registrar(operacao: string, entidade: string, entidadeId: string | undefined, antes: unknown, depois: unknown, usuario: string, db: PrismaClientOuTx) {
    return this.repo.registrar({ operacao, entidade, entidadeId, dadosAntes: sanitizar(antes), dadosDepois: sanitizar(depois), usuarioResponsavel: usuario }, db);
  }
  listar(query: FiltroJournal) {
    if (query.inicio && query.fim && new Date(query.inicio) > new Date(query.fim)) throw new RegraNegocioError('Período invertido.');
    return this.repo.listar(query);
  }
}
