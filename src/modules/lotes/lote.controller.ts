import { FastifyInstance } from 'fastify';
import { StatusLote } from '../../generated/prisma/client';
import { LoteService } from './lote.service';
import { FiltroLote } from './lote.repository';
import { LoteInput, loteSchema, loteResposta, loteQuery } from './lote.schemas';
import { schema, idParams, respostaPagina, objeto, texto, versao } from '../../shared/schemas';

export function loteRotas(app: FastifyInstance, service: LoteService) {
  const cadastro = app.authorize(['ADMINISTRADOR', 'OPERADOR_CADASTRO']);
  const gestao = app.authorize(['ADMINISTRADOR', 'GESTOR_ALMOXARIFADO']);
  const leitura = app.authorize(['ADMINISTRADOR', 'OPERADOR_CADASTRO', 'GESTOR_ALMOXARIFADO', 'AUDITORIA']);
  app.post<{ Body: LoteInput }>('/api/v1/lotes', { preHandler: cadastro, schema: schema(['Lotes'], loteResposta, { body: loteSchema }, 201) }, async (r, reply) => reply.code(201).send(await service.criar(r.body, r.user)));
  app.get<{ Querystring: FiltroLote }>('/api/v1/lotes', { preHandler: leitura, schema: schema(['Lotes'], respostaPagina(loteResposta), { querystring: loteQuery }) }, r => service.listar(r.query));
  app.get<{ Params: { id: string } }>('/api/v1/lotes/:id', { preHandler: leitura, schema: schema(['Lotes'], loteResposta, { params: idParams }) }, r => service.obter(r.params.id));
  app.patch<{ Params: { id: string }; Body: { transportadora?: string; observacoes?: string; versao: number } }>('/api/v1/lotes/:id', { preHandler: cadastro, schema: schema(['Lotes'], loteResposta, { params: idParams, body: objeto({ transportadora: texto, observacoes: { type: 'string', maxLength: 4000 }, versao }, ['versao']) }) }, r => service.atualizar(r.params.id, r.body, r.user));
  for (const [acao, status] of [['iniciar', 'EM_TRIAGEM'], ['concluir', 'TRIAGEM_CONCLUIDA']] as const) {
    app.post<{ Params: { id: string }; Body: { versao: number } }>(`/api/v1/lotes/:id/triagem/${acao}`, { preHandler: gestao, schema: schema(['Lotes'], loteResposta, { params: idParams, body: objeto({ versao }, ['versao']) }) }, r => service.transicionar(r.params.id, status, r.body.versao, r.user));
  }
  app.patch<{ Params: { id: string }; Body: { status: StatusLote; versao: number } }>('/api/v1/lotes/:id/status', { preHandler: gestao, schema: schema(['Lotes'], loteResposta, { params: idParams, body: objeto({ status: { type: 'string', enum: ['ENCAMINHADO', 'FINALIZADO'] }, versao }, ['status', 'versao']) }) }, r => service.transicionar(r.params.id, r.body.status, r.body.versao, r.user));
}
