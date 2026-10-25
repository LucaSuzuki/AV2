import { FastifyInstance } from 'fastify';
import { OrganizacaoService } from './organizacao.service';
import { FiltroOrganizacao } from './organizacao.repository';
import { OrganizacaoInput, ContratoInput, organizacaoResposta, contratoResposta, criarOrganizacaoSchema, atualizarOrganizacaoSchema, contratoSchema, organizacaoQuery } from './organizacao.schemas';
import { schema, idParams, respostaPagina, objeto, versao, dataHora } from '../../shared/schemas';

export function organizacaoRotas(app: FastifyInstance, service: OrganizacaoService) {
  const escrita = app.authorize(['ADMINISTRADOR', 'OPERADOR_CADASTRO']);
  const leitura = app.authorize(['ADMINISTRADOR', 'OPERADOR_CADASTRO', 'GESTOR_ALMOXARIFADO', 'AUDITORIA']);
  app.post<{ Body: OrganizacaoInput }>('/api/v1/organizacoes', { preHandler: escrita, schema: schema(['Organizações'], organizacaoResposta, { body: criarOrganizacaoSchema }, 201) }, async (r, reply) => reply.code(201).send(await service.criar(r.body, r.user)));
  app.get<{ Querystring: FiltroOrganizacao }>('/api/v1/organizacoes', { preHandler: leitura, schema: schema(['Organizações'], respostaPagina(organizacaoResposta), { querystring: organizacaoQuery }) }, r => service.listar(r.query));
  app.get<{ Params: { id: string } }>('/api/v1/organizacoes/:id', { preHandler: leitura, schema: schema(['Organizações'], organizacaoResposta, { params: idParams }) }, r => service.obter(r.params.id));
  app.patch<{ Params: { id: string }; Body: Partial<OrganizacaoInput> & { versao: number } }>('/api/v1/organizacoes/:id', { preHandler: escrita, schema: schema(['Organizações'], organizacaoResposta, { params: idParams, body: atualizarOrganizacaoSchema }) }, r => service.atualizar(r.params.id, r.body, r.user));
  app.post<{ Params: { id: string }; Body: { versao: number } }>('/api/v1/organizacoes/:id/desativar', { preHandler: escrita, schema: schema(['Organizações'], organizacaoResposta, { params: idParams, body: objeto({ versao }, ['versao']) }) }, r => service.desativar(r.params.id, r.body.versao, r.user));
  app.put<{ Params: { id: string }; Body: ContratoInput }>('/api/v1/organizacoes/:id/contrato', { preHandler: escrita, schema: schema(['Contratos'], contratoResposta, { params: idParams, body: contratoSchema }) }, r => service.salvarContrato(r.params.id, r.body, r.user));
  app.get<{ Params: { id: string } }>('/api/v1/organizacoes/:id/contrato', { preHandler: leitura, schema: schema(['Contratos'], contratoResposta, { params: idParams }) }, r => service.obterContrato(r.params.id));
  app.post<{ Params: { id: string }; Body: { novoVencimento: string; versao: number } }>('/api/v1/organizacoes/:id/contrato/renovar', { preHandler: escrita, schema: schema(['Contratos'], contratoResposta, { params: idParams, body: objeto({ novoVencimento: dataHora, versao }, ['novoVencimento', 'versao']) }) }, r => service.renovarContrato(r.params.id, r.body, r.user));
}
