import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service';
import { loginSchema, senhaSchema, tokenResposta } from './auth.schemas';
import { schema, semConteudo } from '../../shared/schemas';

export function authRotas(app: FastifyInstance, service: AuthService) {
  app.post<{ Body: { usuario: string; senha: string } }>('/api/v1/auth/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, schema: schema(['Auth'], tokenResposta, { body: loginSchema, security: [] }) }, req => service.login(req.body.usuario, req.body.senha));
  app.post('/api/v1/auth/renovar', { schema: schema(['Auth'], tokenResposta) }, req => service.renovar(req.user));
  app.post('/api/v1/auth/logout', { schema: schema(['Auth'], semConteudo, {}, 204) }, async (req, reply) => { await service.logout(req.user); return reply.code(204).send(); });
  app.patch<{ Body: { senhaAtual: string; senhaNova: string } }>('/api/v1/auth/senha', { schema: schema(['Auth'], semConteudo, { body: senhaSchema }, 204) }, async (req, reply) => { await service.alterarSenha(req.body, req.user); return reply.code(204).send(); });
}
