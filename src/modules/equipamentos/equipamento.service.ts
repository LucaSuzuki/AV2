import { EquipamentoRepository, FiltroEquipamento } from './equipamento.repository';
import { EquipamentoInput } from './equipamento.schemas';
import { LoteRepository } from '../lotes/lote.repository';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Ator, PrismaClientOuTx } from '../../shared/tipos';
import { NaoEncontradoError, RegraNegocioError, conferirVersao } from '../../shared/errors';
import { validarEstadoFisico, validarTransicao, transicoesRastreamento } from '../../domain/regras/transicoes';
import { StatusRastreamento } from '../../generated/prisma/client';

export class EquipamentoService {
  constructor(private repo: EquipamentoRepository, private lotes: LoteRepository, private auditoria: AuditoriaService) {}
  listar(q: FiltroEquipamento) { return this.repo.listar(q); }
  async obter(id: string) { const e = await this.repo.porId(id); if (!e) throw new NaoEncontradoError(); return { ...e, depreciacao: e.calcularDepreciacao() }; }
  async rastrear(id: string) { const e = await this.obter(id); return { equipamento: e, movimentacoes: e.historicoMovimentacao, totalMovimentacoes: e.historicoMovimentacao.length }; }
  // Reutilizado pela criação composta de lote, sempre com a mesma transação.
  async cadastrarNaTransacao(loteId: string, dados: EquipamentoInput, ator: Ator, db: PrismaClientOuTx) {
    const lote = await this.lotes.porId(loteId, db); if (!lote) throw new NaoEncontradoError('Lote não encontrado.');
    if (!['RECEBIDO', 'EM_TRIAGEM'].includes(lote.statusProcessamento)) throw new RegraNegocioError('Equipamentos só entram em lote recebido ou em triagem.');
    const e = await this.repo.criar({ ...dados, loteId }, db);
    await this.repo.movimentar({ equipamentoId: e.id, origem: 'CADASTRO', destino: e.statusRastreamento, responsavel: ator.usuario, observacao: 'Equipamento cadastrado no lote' }, db);
    await this.auditoria.registrar('CREATE', 'Equipamento', e.id, undefined, e, ator.usuario, db);
    return (await this.repo.porId(e.id, db))!;
  }
  cadastrar(loteId: string, dados: EquipamentoInput, ator: Ator) { return this.repo.transacao(db => this.cadastrarNaTransacao(loteId, dados, ator, db), true); }
  atualizarEstado(id: string, dados: { novoEstado: number; justificativa?: string; versao: number }, ator: Ator) {
    return this.repo.transacao(async db => {
      const antes = await this.repo.porId(id, db); if (!antes) throw new NaoEncontradoError();
      conferirVersao(antes.versao, dados.versao);
      validarEstadoFisico(antes.estadoFisico, dados.novoEstado, dados.justificativa);
      await this.repo.atualizar(id, dados.versao, { estadoFisico: dados.novoEstado }, db);
      await this.repo.movimentar({ equipamentoId: id, origem: String(antes.estadoFisico), destino: String(dados.novoEstado), responsavel: ator.usuario, observacao: dados.justificativa ?? 'Atualização de estado físico' }, db);
      const depois = (await this.repo.porId(id, db))!;
      await this.auditoria.registrar('UPDATE_ESTADO', 'Equipamento', id, antes, depois, ator.usuario, db); return depois;
    });
  }
  atualizarStatus(id: string, dados: { novoStatus: StatusRastreamento; justificativa?: string; versao: number }, ator: Ator) {
    return this.repo.transacao(async db => {
      const antes = await this.repo.porId(id, db); if (!antes) throw new NaoEncontradoError();
      conferirVersao(antes.versao, dados.versao);
      validarTransicao(transicoesRastreamento, antes.statusRastreamento, dados.novoStatus);
      const lote = await this.lotes.porId(antes.loteId, db); if (!lote) throw new NaoEncontradoError();
      if (['AGUARDANDO_DESMONTE', 'EM_DESMONTE'].includes(dados.novoStatus) && lote.statusProcessamento !== 'TRIAGEM_CONCLUIDA') throw new RegraNegocioError('Desmonte exige lote com triagem concluída.');
      await this.repo.atualizar(id, dados.versao, { statusRastreamento: dados.novoStatus }, db);
      await this.repo.movimentar({ equipamentoId: id, origem: antes.statusRastreamento, destino: dados.novoStatus, responsavel: ator.usuario, observacao: dados.justificativa ?? 'Atualização de rastreamento' }, db);
      const depois = (await this.repo.porId(id, db))!;
      await this.auditoria.registrar('UPDATE_STATUS', 'Equipamento', id, antes, depois, ator.usuario, db); return depois;
    }, true);
  }
  gerarCodigoBarras(tipo: string, sequencia: number) { return `${tipo}-${String(sequencia).padStart(6, '0')}`; }
}
