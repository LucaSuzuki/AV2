import { FastifyInstance } from 'fastify';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export function criarPrisma(databaseUrl: string) {
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL PostgreSQL obrigatória.');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
export function registrarPrisma(app: FastifyInstance, prisma: PrismaClient) {
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => { await prisma.$disconnect(); });
}
declare module 'fastify' { interface FastifyInstance { prisma: PrismaClient; } }
