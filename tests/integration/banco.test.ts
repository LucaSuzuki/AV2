import { Prisma } from '../../src/generated/prisma/client';
import { db, preparar, limpar } from '../setup/fixtures';

beforeEach(preparar);
afterAll(async () => { await limpar(); await db.$disconnect(); });

describe('Constraints e triggers via SQL cru', () => {
  test.each([
    ['estado físico', Prisma.sql`UPDATE equipamentos SET "estadoFisico" = 7`],
    ['peso', Prisma.sql`UPDATE equipamentos SET "pesoQuilogramas" = 0`],
    ['posição', Prisma.sql`UPDATE equipamentos SET "posicaoNoLote" = 0`],
    ['ano baixo', Prisma.sql`UPDATE equipamentos SET "anoFabricacao" = 1949`],
    ['ano alto', Prisma.sql`UPDATE equipamentos SET "anoFabricacao" = 2101`],
    ['valor mensal', Prisma.sql`UPDATE contratos SET "valorMensal" = -1`],
    ['vigência', Prisma.sql`UPDATE contratos SET "dataVencimento" = "dataAssinatura"`],
    ['CNPJ', Prisma.sql`UPDATE organizacoes SET cnpj = 'ABCD'`],
    ['movimentação UPDATE', Prisma.sql`UPDATE movimentacoes SET observacao = 'alterada'`],
    ['movimentação DELETE', Prisma.sql`DELETE FROM movimentacoes`],
    ['desmonte antecipado', Prisma.sql`UPDATE equipamentos SET "statusRastreamento" = 'EM_DESMONTE' WHERE "loteId" IN (SELECT id FROM lotes WHERE "statusProcessamento" = 'RECEBIDO')`],
    ['aguardando desmonte antecipado', Prisma.sql`UPDATE equipamentos SET "statusRastreamento" = 'AGUARDANDO_DESMONTE' WHERE "loteId" IN (SELECT id FROM lotes WHERE "statusProcessamento" = 'EM_TRIAGEM')`],
    ['saída de triagem com desmonte pendente', Prisma.sql`UPDATE lotes SET "statusProcessamento" = 'ENCAMINHADO' WHERE "statusProcessamento" = 'TRIAGEM_CONCLUIDA'`],
  ])('%s rejeitado no banco', async (_nome, sql) => { await expect(db.$executeRaw(sql as Prisma.Sql)).rejects.toThrow(); });
  test('data futura rejeitada no INSERT; histórico de mais de 90 dias permitido', async () => {
    const org = await db.organizacao.findFirstOrThrow();
    await expect(db.$executeRaw`INSERT INTO lotes (id, "organizacaoId", "dataEntrada", "notaFiscal", transportadora) VALUES (gen_random_uuid(), ${org.id}::uuid, CURRENT_TIMESTAMP + INTERVAL '1 day', 'FUTURO', 'T')`).rejects.toThrow();
    await expect(db.$executeRaw`INSERT INTO lotes (id, "organizacaoId", "dataEntrada", "notaFiscal", transportadora) VALUES (gen_random_uuid(), ${org.id}::uuid, CURRENT_TIMESTAMP - INTERVAL '365 days', 'HISTORICO', 'T')`).resolves.toBe(1);
  });
  test('FK restritiva impede remoção de organização com lote', async () => {
    const lote = await db.lote.findFirstOrThrow();
    await expect(db.$executeRaw`DELETE FROM organizacoes WHERE id = ${lote.organizacaoId}::uuid`).rejects.toThrow();
  });
  test('unicidades de CNPJ, código de barras, posição e contrato são do banco', async () => {
    const orgs = await db.organizacao.findMany();
    await expect(db.$executeRaw`UPDATE organizacoes SET cnpj = ${orgs[0].cnpj} WHERE id = ${orgs[1].id}::uuid`).rejects.toThrow();
    const equips = await db.equipamento.findMany();
    await expect(db.$executeRaw`UPDATE equipamentos SET "codigoBarrasInterno" = ${equips[0].codigoBarrasInterno} WHERE id = ${equips[1].id}::uuid`).rejects.toThrow();
    const [a, b] = equips.filter(e => e.loteId === '00000000-0000-4000-8000-000000000003');
    await expect(db.$executeRaw`UPDATE equipamentos SET "posicaoNoLote" = ${a.posicaoNoLote} WHERE id = ${b.id}::uuid`).rejects.toThrow();
    const contratos = await db.contrato.findMany();
    await expect(db.$executeRaw`UPDATE contratos SET "organizacaoId" = ${contratos[0].organizacaoId}::uuid WHERE id = ${contratos[1].id}::uuid`).rejects.toThrow();
  });
});
