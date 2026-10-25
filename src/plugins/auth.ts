import jwt from '@fastify/jwt';
import { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { Ator } from '../shared/tipos';
import { ProibidoError, NaoAutorizadoError } from '../shared/errors';
import { UsuarioRepository } from '../modules/usuarios/usuario.repository';

declare module '@fastify/jwt' { interface FastifyJWT { payload: Ator; user: Ator; } }
declare module 'fastify' { interface FastifyInstance { authenticate: preHandlerHookHandler; authorize: (papeis: readonly string[]) => preHandlerHookHandler; } }
export async function registrarAuth(app: FastifyInstance, segredo: string) {
  await app.register(jwt, { secret: segredo, sign: { expiresIn: '30m' } });
  app.decorate('authenticate', async function(request) { await request.jwtVerify(); });
  app.decorate('authorize', (papeis: readonly string[]): preHandlerHookHandler => async request => {
    if (!papeis.includes(request.user.papel)) throw new ProibidoError();
    if (request.url.split('?')[0].startsWith('/api/v1/usuarios') && request.method !== 'GET') {
      const atual = await new UsuarioRepository(app.prisma).porId(request.user.sub);
      if (!atual?.ativo) throw new NaoAutorizadoError();
      if (atual.papel !== 'ADMINISTRADOR') throw new ProibidoError();
    }
  });
  app.addHook('onRequest', async request => {
    const caminho = request.url.split('?')[0];
    const publica = (request.method === 'GET' || request.method === 'HEAD') && (caminho === '/health' || caminho === '/docs' || caminho.startsWith('/docs/'));
    if (publica || request.method === 'OPTIONS' || (request.method === 'POST' && caminho === '/api/v1/auth/login')) return;
    await request.jwtVerify();
  });
}
