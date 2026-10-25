import 'dotenv/config';
import { hash } from 'bcryptjs';
import { criarPrisma } from '../src/plugins/prisma';
import { PrismaClient, PapelUsuario, StatusLote, TipoEquipamento, StatusRastreamento } from '../src/generated/prisma/client';

export async function seed(db: PrismaClient, env: NodeJS.ProcessEnv = process.env) {
  if (!env.SEED_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD.length < 12) throw new Error('Defina SEED_ADMIN_PASSWORD com pelo menos 12 caracteres.');
  if (Buffer.byteLength(env.SEED_ADMIN_PASSWORD, 'utf8') > 72) throw new Error('SEED_ADMIN_PASSWORD ultrapassa 72 bytes UTF-8.');
  const usuarios: { usuario: string; senha: string; papel: PapelUsuario }[] = [{ usuario: env.SEED_ADMIN_USER ?? 'admin', senha: env.SEED_ADMIN_PASSWORD, papel: PapelUsuario.ADMINISTRADOR }];
  if (env.NODE_ENV !== 'production') usuarios.push(
    { usuario: 'operador', senha: 'Operador-AV2-2026!', papel: PapelUsuario.OPERADOR_CADASTRO },
    { usuario: 'almoxarife', senha: 'Almoxarife-AV2-2026!', papel: PapelUsuario.GESTOR_ALMOXARIFADO },
    { usuario: 'auditor', senha: 'Auditor-AV2-2026!', papel: PapelUsuario.AUDITORIA },
  );
  const custo = Number(env.BCRYPT_COST ?? 12);
  if (!Number.isInteger(custo) || custo < 10 || custo > 16) throw new Error('BCRYPT_COST inválido.');
  await db.$transaction(async tx => {
    for (const u of usuarios) await tx.usuario.upsert({ where: { usuario: u.usuario }, update: {}, create: { usuario: u.usuario, papel: u.papel, hashSenha: await hash(u.senha, custo) } });
    const agora = new Date();
    const dias = (n: number) => new Date(agora.getTime() + n * 86400000);
    const cnpjs = ['12345678000195', '11222333000181', '11444777000161', '45723174000110'];
    const orgs = [];
    for (let i = 0; i < cnpjs.length; i++) orgs.push(await tx.organizacao.upsert({ where: { cnpj: cnpjs[i] }, update: {}, create: {
      razaoSocial: `Organização Exemplo ${i + 1}`, cnpj: cnpjs[i], inscricaoEstadual: `IE${i + 1}`,
      enderecoCompleto: `Rua Exemplo, ${i + 1}`, telefone: '11999999999', email: `contato${i + 1}@exemplo.com`, ativo: i !== 3,
    } }));
    for (let i = 0; i < 2; i++) await tx.contrato.upsert({ where: { organizacaoId: orgs[i].id }, update: {}, create: {
      organizacaoId: orgs[i].id, dataAssinatura: dias(-30), dataVencimento: dias(i === 0 ? 365 : -1),
      valorMensal: (i + 1) * 150, clausulas: ['Coleta e destinação responsável'], renovacaoAutomatica: i === 0,
    } });
    const estados = Object.values(StatusLote);
    const lotes = [];
    for (let i = 0; i < estados.length; i++) lotes.push(await tx.lote.upsert({
      where: { id: `00000000-0000-4000-8000-00000000000${i + 1}` }, update: {}, create: {
        id: `00000000-0000-4000-8000-00000000000${i + 1}`, organizacaoId: orgs[i % 3].id,
        dataEntrada: dias(-[2, 15, 45, 85, 85][i]), notaFiscal: `SEED-NF-${i + 1}`, transportadora: 'Logística Verde', statusProcessamento: estados[i],
      },
    }));
    const status = Object.values(StatusRastreamento);
    const tipos = Object.values(TipoEquipamento);
    for (let i = 0; i < tipos.length; i++) {
      const lote = lotes[[0, 1, 2, 2, 3, 3, 4, 4][i]];
      const equipamento = await tx.equipamento.upsert({ where: { codigoBarrasInterno: `${tipos[i]}-${String(i + 1).padStart(6, '0')}` }, update: {}, create: {
        codigoBarrasInterno: `${tipos[i]}-${String(i + 1).padStart(6, '0')}`, tipo: tipos[i], marca: 'Exemplo', modelo: `Eco ${i + 1}`,
        anoFabricacao: 2018 + i, estadoFisico: i % 7, pesoQuilogramas: 1.5 + i, loteId: lote.id, posicaoNoLote: i + 1, statusRastreamento: status[i],
      } });
      // Não atualiza movimentações existentes: a trilha é imutável também no seed.
      if (!await tx.movimentacao.findFirst({ where: { equipamentoId: equipamento.id } })) {
        const caminho: StatusRastreamento[] = ['AGUARDANDO_TRIAGEM', 'EM_TRIAGEM', 'AGUARDANDO_DESMONTE', 'EM_DESMONTE'];
        if (i >= 4) caminho.push(status[i] === 'BAIXA_DEFINITIVA' ? 'DESCARTE_SEGURO' : status[i]);
        if (i === 7) caminho.push('BAIXA_DEFINITIVA');
        const final = caminho.indexOf(status[i]);
        let origem = 'CADASTRO';
        let passo = 0;
        for (const destino of caminho.slice(0, final + 1)) {
          await tx.movimentacao.create({ data: { equipamentoId: equipamento.id, origem, destino, responsavel: usuarios[0].usuario, dataHora: new Date(lote.dataEntrada.getTime() + passo++ * 60000), observacao: 'Histórico demonstrativo de triagem e destinação' } });
          origem = destino;
        }
        if (i >= 2) await tx.movimentacao.create({ data: { equipamentoId: equipamento.id, origem: '0', destino: String(i % 7), responsavel: usuarios[0].usuario, dataHora: new Date(lote.dataEntrada.getTime() + passo * 60000), observacao: 'Inspeção constatou desgaste e avarias; reclassificação justificada.' } });
      }
    }
  }, { timeout: 60000 });
}

if (require.main === module) {
  const db = criarPrisma(process.env.DATABASE_URL ?? '');
  seed(db).then(() => console.log('Seed concluído.')).catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => db.$disconnect());
}
