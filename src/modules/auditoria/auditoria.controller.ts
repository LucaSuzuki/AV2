import { FastifyInstance } from 'fastify';
import { AuditoriaService } from './auditoria.service';
import { FiltroJournal } from './auditoria.repository';
import { schema, objeto, uuid, texto, dataHora, versao, respostaPagina, paginacao } from '../../shared/schemas';
export function auditoriaRotas(app: FastifyInstance, service: AuditoriaService) {
  const journalResposta = objeto({ id: uuid, timestamp: dataHora, operacao: texto, entidade: texto, entidadeId: { anyOf: [texto, { type: 'null' }] }, dadosAntes: {}, dadosDepois: {}, usuarioResponsavel: texto, versao });
  app.get<{ Querystring: FiltroJournal }>('/api/v1/auditoria/journal', { preHandler: app.authorize(['ADMINISTRADOR', 'AUDITORIA']), schema: schema(['Auditoria'], respostaPagina(journalResposta), { querystring: objeto({ ...paginacao, entidade: texto, usuario: texto, inicio: dataHora, fim: dataHora }) }) }, r => service.listar(r.query));
}
