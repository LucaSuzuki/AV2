import { FastifyInstance } from 'fastify';
import { RelatorioService, Periodo } from './relatorio.service';
import { StatusLote } from '../../generated/prisma/client';
import { schema, objeto, uuid } from '../../shared/schemas';
import { loteResposta, statusLoteSchema } from '../lotes/lote.schemas';
import { periodoSchema, financeiroResposta, resumoResposta } from './relatorio.schemas';

export function relatorioRotas(app: FastifyInstance, service: RelatorioService) {
  const preHandler = app.authorize(['ADMINISTRADOR', 'OPERADOR_CADASTRO', 'GESTOR_ALMOXARIFADO', 'AUDITORIA']);
  app.get<{ Params: { organizacaoId: string }; Querystring: Periodo }>('/api/v1/relatorios/por-organizacao/:organizacaoId', { preHandler, schema: schema(['Relatórios'], { type: 'array', items: loteResposta }, { params: objeto({ organizacaoId: uuid }, ['organizacaoId']), querystring: periodoSchema }) }, r => service.porOrganizacao(r.params.organizacaoId, r.query));
  app.get<{ Querystring: { status: StatusLote } }>('/api/v1/relatorios/por-status', { preHandler, schema: schema(['Relatórios'], { type: 'array', items: loteResposta }, { querystring: objeto({ status: statusLoteSchema }, ['status']) }) }, r => service.porStatus(r.query.status));
  app.get<{ Querystring: Periodo }>('/api/v1/relatorios/financeiro', { preHandler, schema: schema(['Relatórios'], financeiroResposta, { querystring: periodoSchema }) }, r => service.financeiro(r.query));
  app.get<{ Querystring: Periodo }>('/api/v1/relatorios/resumo', { preHandler, schema: schema(['Relatórios'], resumoResposta, { querystring: periodoSchema }) }, r => service.resumo(r.query));
}
