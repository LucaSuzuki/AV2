import { FastifyInstance } from 'fastify';
import { StatusRastreamento } from '../../generated/prisma/client';
import { EquipamentoService } from './equipamento.service';
import { FiltroEquipamento } from './equipamento.repository';
import { EquipamentoInput, equipamentoSchema, equipamentoResposta, equipamentoQuery, rastreioResposta, estadoFisicoSchema, statusRastreamentoSchema } from './equipamento.schemas';
import { schema, idParams, respostaPagina, objeto, uuid, versao } from '../../shared/schemas';

export function equipamentoRotas(app: FastifyInstance, service: EquipamentoService) {
  const cadastro = app.authorize(['ADMINISTRADOR', 'OPERADOR_CADASTRO']);
  const gestao = app.authorize(['ADMINISTRADOR', 'GESTOR_ALMOXARIFADO']);
  const leitura = app.authorize(['ADMINISTRADOR', 'OPERADOR_CADASTRO', 'GESTOR_ALMOXARIFADO', 'AUDITORIA']);
  app.post<{ Params: { loteId: string }; Body: EquipamentoInput }>('/api/v1/lotes/:loteId/equipamentos', { preHandler: cadastro, schema: schema(['Equipamentos'], equipamentoResposta, { params: objeto({ loteId: uuid }, ['loteId']), body: equipamentoSchema }, 201) }, async (r, reply) => reply.code(201).send(await service.cadastrar(r.params.loteId, r.body, r.user)));
  app.get<{ Querystring: FiltroEquipamento }>('/api/v1/equipamentos', { preHandler: leitura, schema: schema(['Equipamentos'], respostaPagina(equipamentoResposta), { querystring: equipamentoQuery }) }, r => service.listar(r.query));
  app.get<{ Params: { id: string } }>('/api/v1/equipamentos/:id', { preHandler: leitura, schema: schema(['Equipamentos'], equipamentoResposta, { params: idParams }) }, r => service.obter(r.params.id));
  app.get<{ Params: { id: string } }>('/api/v1/equipamentos/:id/rastreio', { preHandler: leitura, schema: schema(['Equipamentos'], rastreioResposta, { params: idParams }) }, r => service.rastrear(r.params.id));
  app.patch<{ Params: { id: string }; Body: { novoEstado: number; justificativa?: string; versao: number } }>('/api/v1/equipamentos/:id/estado-fisico', { preHandler: gestao, schema: schema(['Equipamentos'], equipamentoResposta, { params: idParams, body: objeto({ novoEstado: estadoFisicoSchema, justificativa: { type: 'string', maxLength: 4000 }, versao }, ['novoEstado', 'versao']) }) }, r => service.atualizarEstado(r.params.id, r.body, r.user));
  app.patch<{ Params: { id: string }; Body: { novoStatus: StatusRastreamento; justificativa?: string; versao: number } }>('/api/v1/equipamentos/:id/status-rastreamento', { preHandler: gestao, schema: schema(['Equipamentos'], equipamentoResposta, { params: idParams, body: objeto({ novoStatus: statusRastreamentoSchema, justificativa: { type: 'string', maxLength: 4000 }, versao }, ['novoStatus', 'versao']) }) }, r => service.atualizarStatus(r.params.id, r.body, r.user));
}
