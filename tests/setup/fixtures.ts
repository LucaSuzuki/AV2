import { FastifyInstance, InjectOptions } from 'fastify';
import { criarPrisma } from '../../src/plugins/prisma';
import { seed } from '../../prisma/seed';
import { bancoTeste } from './database';
export const db = criarPrisma(bancoTeste());
export const senhaAdmin = 'Admin-Teste-2026!';
export const seedEnv = { ...process.env, NODE_ENV: 'test', BCRYPT_COST: '10', SEED_ADMIN_USER: 'admin', SEED_ADMIN_PASSWORD: senhaAdmin };
let contador = 1;
export async function limpar() {
  await db.$executeRawUnsafe('TRUNCATE movimentacoes, equipamentos, lotes, contratos, organizacoes, usuarios, journal_transacoes RESTART IDENTITY CASCADE');
}
export async function preparar() { await limpar(); await seed(db, seedEnv); }
export async function token(app: FastifyInstance, papel = 'ADMINISTRADOR') {
  const u = await db.usuario.findFirstOrThrow({ where: { papel: papel as any, ativo: true } });
  return app.jwt.sign({ sub: u.id, usuario: u.usuario, papel: u.papel });
}
export async function chamar(app: FastifyInstance, jwt: string | undefined, method: InjectOptions['method'], url: string, payload?: unknown) {
  return app.inject({ method, url, payload: payload as any, headers: jwt ? { authorization: `Bearer ${jwt}` } : {}, remoteAddress: `10.0.${Math.floor(contador / 250)}.${contador++ % 250 + 1}` });
}
export const equipamentoInput = (codigo = 'TESTE-001') => ({ codigoBarrasInterno: codigo, tipo: 'NOTEBOOK', marca: 'Dell', modelo: 'Latitude', anoFabricacao: 2024, estadoFisico: 1, pesoQuilogramas: 2.5, posicaoNoLote: 1 });
export const organizacaoInput = { razaoSocial: 'Teste', cnpj: '12.345.678/0001-95', inscricaoEstadual: '123', enderecoCompleto: 'Rua Teste, 1', telefone: '11999999999', email: 'teste@exemplo.com' };
