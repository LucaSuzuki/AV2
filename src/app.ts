import Fastify from 'fastify';
import { lerEnv, Config } from './config/env';
import { registrarSwagger } from './plugins/swagger';
import { registrarErros } from './plugins/error-handler';
import { criarPrisma, registrarPrisma } from './plugins/prisma';
import { PrismaClient } from './generated/prisma/client';
import { BaseRepository } from './shared/base.repository';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { registrarAuth } from './plugins/auth';
import { AuditoriaRepository } from './modules/auditoria/auditoria.repository';
import { AuditoriaService } from './modules/auditoria/auditoria.service';
import { UsuarioRepository } from './modules/usuarios/usuario.repository';
import { UsuarioService } from './modules/usuarios/usuario.service';
import { AuthService } from './modules/auth/auth.service';
import { authRotas } from './modules/auth/auth.controller';
import { usuarioRotas } from './modules/usuarios/usuario.controller';
import { OrganizacaoRepository } from './modules/organizacoes/organizacao.repository';
import { OrganizacaoService } from './modules/organizacoes/organizacao.service';
import { organizacaoRotas } from './modules/organizacoes/organizacao.controller';
import { LoteRepository } from './modules/lotes/lote.repository';
import { LoteService } from './modules/lotes/lote.service';
import { loteRotas } from './modules/lotes/lote.controller';
import { EquipamentoRepository } from './modules/equipamentos/equipamento.repository';
import { EquipamentoService } from './modules/equipamentos/equipamento.service';
import { equipamentoRotas } from './modules/equipamentos/equipamento.controller';
import { RelatorioRepository } from './modules/relatorios/relatorio.repository';
import { RelatorioService } from './modules/relatorios/relatorio.service';
import { relatorioRotas } from './modules/relatorios/relatorio.controller';
import { auditoriaRotas } from './modules/auditoria/auditoria.controller';
import { randomUUID } from 'node:crypto';

export async function buildApp(options: { config?: Config; logger?: boolean; prisma?: PrismaClient } = {}) {
  const config = options.config ?? lerEnv();
  const app = Fastify({ bodyLimit: 1048576, ajv: { customOptions: { removeAdditional: false, multipleOfPrecision: 8 } }, logger: options.logger === false ? false : {
    level: config.logLevel,
    redact: ['req.headers.authorization', 'senha', 'senhaAtual', 'senhaNova', 'hashSenha', '*.senha', '*.hashSenha'],
  } });
  registrarErros(app);
  registrarPrisma(app, options.prisma ?? criarPrisma(config.databaseUrl));
  await registrarSwagger(app);
  await app.register(cors, { origin: config.corsOrigin });
  await app.register(helmet);
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  await registrarAuth(app, config.jwtSecret);
  const auditoria = new AuditoriaService(new AuditoriaRepository(app.prisma));
  const usuarios = new UsuarioRepository(app.prisma);
  authRotas(app, new AuthService(usuarios, auditoria, config.bcryptCost, ator => app.jwt.sign({ ...ator, jti: randomUUID() }), token => app.jwt.verify(token)));
  usuarioRotas(app, new UsuarioService(usuarios, auditoria, config.bcryptCost));
  const orgs = new OrganizacaoRepository(app.prisma), lotes = new LoteRepository(app.prisma);
  const equipamentos = new EquipamentoService(new EquipamentoRepository(app.prisma), lotes, auditoria);
  organizacaoRotas(app, new OrganizacaoService(orgs, auditoria));
  equipamentoRotas(app, equipamentos);
  loteRotas(app, new LoteService(lotes, orgs, equipamentos, auditoria));
  relatorioRotas(app, new RelatorioService(new RelatorioRepository(app.prisma), orgs));
  auditoriaRotas(app, auditoria);
  app.get('/health', { schema: { security: [], response: { '2xx': { type: 'object', properties: { status: { type: 'string' }, db: { type: 'string' } } }, '5xx': { type: 'object', properties: { status: { type: 'string' }, db: { type: 'string' } } } } } }, async (_req, reply) => {
    try { await new BaseRepository(app.prisma).saudavel(); return { status: 'ok', db: 'up' }; }
    catch { return reply.code(503).send({ status: 'degraded', db: 'down' }); }
  });
  return app;
}
