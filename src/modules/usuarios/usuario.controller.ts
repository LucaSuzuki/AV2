import { FastifyInstance } from 'fastify';
import { PapelUsuario } from '../../generated/prisma/client';
import { UsuarioService } from './usuario.service';
import { criarUsuarioSchema, atualizarUsuarioSchema, usuarioResposta, listarUsuariosSchema } from './usuario.schemas';
import { schema, idParams, respostaPagina, objeto, versao, semConteudo } from '../../shared/schemas';
import { Paginacao } from '../../shared/pagination';
export function usuarioRotas(app: FastifyInstance, service: UsuarioService) {
  const preHandler = app.authorize(['ADMINISTRADOR']);
  app.post<{ Body: { usuario: string; senha: string; papel: PapelUsuario } }>('/api/v1/usuarios', { preHandler, schema: schema(['Usuários'], usuarioResposta, { body: criarUsuarioSchema }, 201) }, async (req, reply) => reply.code(201).send(await service.criar(req.body, req.user)));
  app.get<{ Querystring: Paginacao }>('/api/v1/usuarios', { preHandler, schema: schema(['Usuários'], respostaPagina(usuarioResposta), { querystring: listarUsuariosSchema }) }, req => service.listar(req.query));
  app.get<{ Params: { id: string } }>('/api/v1/usuarios/:id', { preHandler, schema: schema(['Usuários'], usuarioResposta, { params: idParams }) }, req => service.obter(req.params.id));
  app.patch<{ Params: { id: string }; Body: { versao: number; papel?: PapelUsuario; ativo?: boolean } }>('/api/v1/usuarios/:id', { preHandler, schema: schema(['Usuários'], usuarioResposta, { params: idParams, body: atualizarUsuarioSchema }) }, req => service.atualizar(req.params.id, req.body, req.user));
  app.delete<{ Params: { id: string }; Body: { versao: number } }>('/api/v1/usuarios/:id', { preHandler, schema: schema(['Usuários'], semConteudo, { params: idParams, body: objeto({ versao }, ['versao']) }, 204) }, async (req, reply) => { await service.excluir(req.params.id, req.body.versao, req.user); return reply.code(204).send(); });
}
