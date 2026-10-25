import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { lerEnv } from '../../src/config/env';
import { db, preparar, limpar, token, chamar, senhaAdmin, equipamentoInput, organizacaoInput, seedEnv } from '../setup/fixtures';
import { bancoTeste } from '../setup/database';
import { seed } from '../../prisma/seed';

let app: FastifyInstance;
let admin: string;
const periodo = () => `inicio=${encodeURIComponent(new Date(Date.now() - 100 * 86400000).toISOString())}&fim=${encodeURIComponent(new Date(Date.now() + 86400000).toISOString())}`;
const primeiroLote = () => db.lote.findFirstOrThrow({ where: { statusProcessamento: 'RECEBIDO' } });
const primeiroEquipamento = () => db.equipamento.findFirstOrThrow({ where: { statusRastreamento: 'AGUARDANDO_TRIAGEM' } });

beforeAll(async () => {
  app = await buildApp({ config: lerEnv({ ...process.env, DATABASE_URL: bancoTeste(), JWT_SECRET: 'segredo-de-testes-com-mais-de-32-caracteres', BCRYPT_COST: '10', NODE_ENV: 'test' }), logger: false });
  await app.ready();
});
beforeEach(async () => { await preparar(); admin = await token(app); });
afterAll(async () => { await limpar(); await app.close(); await db.$disconnect(); });

describe('Auth e infraestrutura', () => {
  test('health e Swagger públicos; nenhuma credencial vazada', async () => {
    const health = await chamar(app, undefined, 'GET', '/health'); expect(health.statusCode).toBe(200); expect(health.json()).toEqual({ status: 'ok', db: 'up' });
    expect((await chamar(app, undefined, 'GET', '/docs/')).statusCode).toBe(200);
    const spec = await chamar(app, undefined, 'GET', '/docs/json'); expect(spec.statusCode).toBe(200); expect(spec.json().paths['/api/v1/lotes']).toBeDefined();
  });
  test('login, expiração de 30 min, renovação e logout', async () => {
    const r = await chamar(app, undefined, 'POST', '/api/v1/auth/login', { usuario: 'admin', senha: senhaAdmin }); expect(r.statusCode).toBe(200);
    const u = r.json(); expect(u.usuario.papel).toBe('ADMINISTRADOR'); expect(r.body).not.toContain('hashSenha');
    const claims = app.jwt.verify<any>(u.token); expect(claims.exp - claims.iat).toBe(1800);
    expect((await db.usuario.findUniqueOrThrow({ where: { usuario: 'admin' } })).ultimoAcesso).not.toBeNull();
    const renovado = await chamar(app, u.token, 'POST', '/api/v1/auth/renovar'); expect(renovado.statusCode).toBe(200); expect(renovado.json().token).not.toBe(u.token);
    expect((await chamar(app, u.token, 'POST', '/api/v1/auth/logout')).statusCode).toBe(204);
    expect(await db.journalTransacao.count({ where: { operacao: 'LOGOUT' } })).toBe(1);
  });
  test('credenciais inválidas têm a mesma resposta', async () => {
    const a = await chamar(app, undefined, 'POST', '/api/v1/auth/login', { usuario: 'admin', senha: 'errada' });
    const b = await chamar(app, undefined, 'POST', '/api/v1/auth/login', { usuario: 'inexistente', senha: 'errada' });
    expect(a.statusCode).toBe(401); expect(b.json()).toEqual(a.json()); expect(a.json().message).toBe('Credenciais invalidas');
  });
  test.each(['ausente', 'adulterado', 'expirado'])('token %s -> 401', async tipo => {
    const expirado = app.jwt.sign({ sub: randomUUID(), usuario: 'admin', papel: 'ADMINISTRADOR' }, { expiresIn: -1 });
    const jwt = tipo === 'ausente' ? undefined : tipo === 'adulterado' ? 'abc.def.ghi' : expirado;
    expect((await chamar(app, jwt, 'GET', '/api/v1/lotes')).statusCode).toBe(401);
  });
  test('alteração de senha persiste e não vaza no journal', async () => {
    const nova = 'Senha-Nova-2026!';
    expect((await chamar(app, admin, 'PATCH', '/api/v1/auth/senha', { senhaAtual: senhaAdmin, senhaNova: nova })).statusCode).toBe(204);
    expect((await chamar(app, undefined, 'POST', '/api/v1/auth/login', { usuario: 'admin', senha: senhaAdmin })).statusCode).toBe(401);
    expect((await chamar(app, undefined, 'POST', '/api/v1/auth/login', { usuario: 'admin', senha: nova })).statusCode).toBe(200);
    const journal = JSON.stringify(await db.journalTransacao.findMany()); expect(journal).not.toContain(nova); expect(journal).not.toContain('hashSenha');
  });
  test('rate limit no login: sexta tentativa -> 429', async () => {
    for (let i = 0; i < 5; i++) expect((await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { usuario: 'x', senha: 'x' }, remoteAddress: '192.0.2.99' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { usuario: 'x', senha: 'x' }, remoteAddress: '192.0.2.99' })).statusCode).toBe(429);
  });
  test('CORS restrito, helmet, schema e limite de corpo', async () => {
    const r = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'http://localhost:5173' } }); expect(r.headers['access-control-allow-origin']).toBe('http://localhost:5173'); expect(r.headers['x-content-type-options']).toBe('nosniff');
    const proibida = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://nao-permitido.example' } }); expect(proibida.headers['access-control-allow-origin']).toBeUndefined();
    expect((await chamar(app, admin, 'GET', '/api/v1/lotes?pageSize=101')).statusCode).toBe(400);
    expect((await chamar(app, admin, 'POST', '/api/v1/lotes', {})).statusCode).toBe(400);
    expect((await chamar(app, admin, 'POST', '/api/v1/organizacoes', { ...organizacaoInput, extra: true })).statusCode).toBe(400);
    expect((await chamar(app, admin, 'POST', '/api/v1/organizacoes', { ...organizacaoInput, razaoSocial: 'a'.repeat(1048600) })).statusCode).toBe(413);
  });
  test('seed é idempotente', async () => {
    const antes = [await db.usuario.count(), await db.organizacao.count(), await db.lote.count(), await db.equipamento.count(), await db.movimentacao.count()];
    await seed(db, seedEnv); await seed(db, seedEnv);
    expect([await db.usuario.count(), await db.organizacao.count(), await db.lote.count(), await db.equipamento.count(), await db.movimentacao.count()]).toEqual(antes);
  });
  test('app.close desconecta Prisma e health informa queda de banco', async () => {
    const { criarPrisma } = await import('../../src/plugins/prisma');
    const outroDb = criarPrisma(bancoTeste());
    const spy = jest.spyOn(outroDb, '$disconnect');
    const a = await buildApp({ config: lerEnv({ ...process.env, DATABASE_URL: bancoTeste(), JWT_SECRET: 'outro-segredo-de-testes-mais-de-32', BCRYPT_COST: '10' }), prisma: outroDb, logger: false });
    const consulta = jest.spyOn(outroDb, '$queryRaw').mockRejectedValue(new Error('indisponível'));
    const h = await a.inject('/health'); expect(h.statusCode).toBe(503); expect(h.json().db).toBe('down');
    consulta.mockRestore(); await a.close(); expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('Matriz RBAC', () => {
  const papeis = ['ADMINISTRADOR', 'OPERADOR_CADASTRO', 'GESTOR_ALMOXARIFADO', 'AUDITORIA'];
  const rotas = [
    { method: 'GET', url: '/api/v1/usuarios', permitidos: [0] },
    { method: 'GET', url: '/api/v1/auditoria/journal', permitidos: [0, 3] },
    { method: 'GET', url: '/api/v1/organizacoes', permitidos: [0, 1, 2, 3] },
    { method: 'POST', url: '/api/v1/organizacoes', permitidos: [0, 1], payload: { ...organizacaoInput, cnpj: '00000000000000' } },
    { method: 'POST', url: '/api/v1/lotes/:id/triagem/iniciar', permitidos: [0, 2], payload: { versao: 1 } },
    { method: 'PATCH', url: '/api/v1/equipamentos/:id/estado-fisico', permitidos: [0, 2], payload: { versao: 1, novoEstado: 0 } },
    { method: 'GET', url: '/api/v1/relatorios/por-status?status=RECEBIDO', permitidos: [0, 1, 2, 3] },
  ];
  test.each(papeis.flatMap((papel, i) => rotas.map(rota => ({ papel, i, ...rota }))))('$papel $method $url', async caso => {
    const jwt = await token(app, caso.papel);
    const id = caso.url.includes('equipamentos') ? (await primeiroEquipamento()).id : (await primeiroLote()).id;
    const r = await chamar(app, jwt, caso.method as any, caso.url.replace(':id', id), 'payload' in caso ? caso.payload : undefined);
    if (caso.permitidos.includes(caso.i)) expect(r.statusCode).not.toBe(403); else expect(r.statusCode).toBe(403);
  });
  test('auditor não exclui nem altera usuários', async () => {
    const jwt = await token(app, 'AUDITORIA'), u = await db.usuario.findFirstOrThrow();
    expect((await chamar(app, jwt, 'PATCH', `/api/v1/usuarios/${u.id}`, { versao: u.versao, ativo: false })).statusCode).toBe(403);
    expect((await chamar(app, jwt, 'DELETE', `/api/v1/usuarios/${u.id}`, { versao: u.versao })).statusCode).toBe(403);
  });
  test('administrador desativado perde acesso a escrita sensível', async () => {
    await db.usuario.updateMany({ where: { usuario: 'admin' }, data: { ativo: false } });
    expect((await chamar(app, admin, 'POST', '/api/v1/usuarios', { usuario: 'teste', senha: 'Teste-seguro-2026!', papel: 'AUDITORIA' })).statusCode).toBe(401);
  });
});

describe('Usuários', () => {
  test('cadastro, consulta, duplicidade e exclusão lógica versionada', async () => {
    const dados = { usuario: 'novo', senha: 'Usuario-Novo-2026!', papel: 'AUDITORIA' };
    const r = await chamar(app, admin, 'POST', '/api/v1/usuarios', dados); expect(r.statusCode).toBe(201); expect(r.body).not.toContain('hashSenha'); const u = r.json();
    expect((await chamar(app, admin, 'GET', `/api/v1/usuarios/${u.id}`)).statusCode).toBe(200);
    expect((await chamar(app, admin, 'POST', '/api/v1/usuarios', dados)).statusCode).toBe(409);
    expect((await chamar(app, admin, 'DELETE', `/api/v1/usuarios/${u.id}`, { versao: 99 })).statusCode).toBe(409);
    expect((await chamar(app, admin, 'DELETE', `/api/v1/usuarios/${u.id}`, { versao: u.versao })).statusCode).toBe(204);
    expect((await db.usuario.findUniqueOrThrow({ where: { id: u.id } })).ativo).toBe(false);
  });
  test('não exclui a si mesmo nem rebaixa o último administrador', async () => {
    const u = await db.usuario.findUniqueOrThrow({ where: { usuario: 'admin' } });
    expect((await chamar(app, admin, 'DELETE', `/api/v1/usuarios/${u.id}`, { versao: u.versao })).statusCode).toBe(422);
    expect((await chamar(app, admin, 'PATCH', `/api/v1/usuarios/${u.id}`, { versao: u.versao, papel: 'AUDITORIA' })).statusCode).toBe(422);
  });
});

describe('Negócio e concorrência', () => {
  test('CNPJ inválido 422, duplicado normalizado 409; filtros e paginação', async () => {
    expect((await chamar(app, admin, 'POST', '/api/v1/organizacoes', { ...organizacaoInput, cnpj: '11111111111111' })).statusCode).toBe(422);
    expect((await chamar(app, admin, 'POST', '/api/v1/organizacoes', organizacaoInput)).statusCode).toBe(409);
    const r = await chamar(app, admin, 'GET', '/api/v1/organizacoes?ativo=true&q=12345678&pageSize=1'); expect(r.json().total).toBe(1); expect(r.json().pageSize).toBe(1);
  });
  test.each([1, -91])('data de entrada inválida (%i dias) -> 422', async dias => {
    const org = await db.organizacao.findFirstOrThrow({ where: { ativo: true } });
    expect((await chamar(app, admin, 'POST', '/api/v1/lotes', { organizacaoId: org.id, notaFiscal: 'NF', transportadora: 'T', dataEntrada: new Date(Date.now() + dias * 86400000).toISOString() })).statusCode).toBe(422);
  });
  test('lote exige organização existente e ativa; contrato é opcional', async () => {
    const inativa = await db.organizacao.findFirstOrThrow({ where: { ativo: false } });
    const dados = { organizacaoId: inativa.id, notaFiscal: 'NF', transportadora: 'T' };
    expect((await chamar(app, admin, 'POST', '/api/v1/lotes', dados)).statusCode).toBe(422);
    expect((await chamar(app, admin, 'POST', '/api/v1/lotes', { ...dados, organizacaoId: randomUUID() })).statusCode).toBe(404);
    const semContrato = await db.organizacao.findUniqueOrThrow({ where: { cnpj: '11444777000161' } });
    expect((await chamar(app, admin, 'POST', '/api/v1/lotes', { ...dados, organizacaoId: semContrato.id })).statusCode).toBe(201);
  });
  test('estado exige justificativa; histórico registra estado anterior e ator', async () => {
    const e = await primeiroEquipamento();
    const url = `/api/v1/equipamentos/${e.id}/estado-fisico`;
    expect((await chamar(app, admin, 'PATCH', url, { versao: e.versao, novoEstado: 4 })).statusCode).toBe(422);
    const r = await chamar(app, admin, 'PATCH', url, { versao: e.versao, novoEstado: 4, justificativa: 'Avarias constatadas' }); expect(r.statusCode).toBe(200);
    const mov = await db.movimentacao.findFirstOrThrow({ where: { equipamentoId: e.id, destino: '4' } }); expect(mov.origem).toBe(String(e.estadoFisico)); expect(mov.origem).not.toBe(mov.destino); expect(mov.responsavel).toBe('admin');
    const detalhe = await chamar(app, admin, 'GET', `/api/v1/equipamentos/${e.id}`); expect(typeof detalhe.json().depreciacao).toBe('number');
  });
  test('desmonte exige triagem; transição inválida não persiste', async () => {
    const e = await db.equipamento.findFirstOrThrow({ where: { statusRastreamento: 'EM_TRIAGEM' } });
    const url = `/api/v1/equipamentos/${e.id}/status-rastreamento`;
    expect((await chamar(app, admin, 'PATCH', url, { versao: e.versao, novoStatus: 'AGUARDANDO_DESMONTE' })).statusCode).toBe(422);
    expect((await chamar(app, admin, 'PATCH', url, { versao: e.versao, novoStatus: 'BAIXA_DEFINITIVA' })).statusCode).toBe(422);
    const lote = await db.lote.findUniqueOrThrow({ where: { id: e.loteId } });
    expect((await chamar(app, admin, 'POST', `/api/v1/lotes/${lote.id}/triagem/concluir`, { versao: lote.versao })).statusCode).toBe(200);
    expect((await chamar(app, admin, 'PATCH', url, { versao: e.versao, novoStatus: 'AGUARDANDO_DESMONTE' })).statusCode).toBe(200);
  });
  test('triagem vazia é rejeitada; cadastro não entra em lote finalizado', async () => {
    const lote = await primeiroLote();
    await db.movimentacao.deleteMany({ where: { equipamentoId: randomUUID() } });
    const vazio = await db.lote.create({ data: { organizacaoId: lote.organizacaoId, notaFiscal: 'vazio', transportadora: 'T', dataEntrada: new Date(), statusProcessamento: 'EM_TRIAGEM' } });
    expect((await chamar(app, admin, 'POST', `/api/v1/lotes/${vazio.id}/triagem/concluir`, { versao: 1 })).statusCode).toBe(422);
    const finalizado = await db.lote.findFirstOrThrow({ where: { statusProcessamento: 'FINALIZADO' } });
    expect((await chamar(app, admin, 'POST', `/api/v1/lotes/${finalizado.id}/equipamentos`, equipamentoInput())).statusCode).toBe(422);
  });
  test('duplicidade de código e posição -> 409', async () => {
    const lote = await primeiroLote(); const e = await primeiroEquipamento();
    expect((await chamar(app, admin, 'POST', `/api/v1/lotes/${lote.id}/equipamentos`, { ...equipamentoInput(e.codigoBarrasInterno), posicaoNoLote: 50 })).statusCode).toBe(409);
    expect((await chamar(app, admin, 'POST', `/api/v1/lotes/${lote.id}/equipamentos`, { ...equipamentoInput(), posicaoNoLote: e.posicaoNoLote })).statusCode).toBe(409);
  });
  test('rollback: segundo código duplicado não deixa lote, equipamento, movimentação nem journal', async () => {
    const org = await db.organizacao.findFirstOrThrow({ where: { ativo: true } });
    const antes = [await db.lote.count(), await db.equipamento.count(), await db.movimentacao.count(), await db.journalTransacao.count()];
    const equipamentos = [equipamentoInput('ROLLBACK-001'), { ...equipamentoInput('ROLLBACK-001'), posicaoNoLote: 2 }];
    const r = await chamar(app, admin, 'POST', '/api/v1/lotes', { organizacaoId: org.id, notaFiscal: 'ROLLBACK', transportadora: 'T', equipamentos }); expect(r.statusCode).toBe(409);
    expect([await db.lote.count(), await db.equipamento.count(), await db.movimentacao.count(), await db.journalTransacao.count()]).toEqual(antes);
  });
  test('dois PATCH concorrentes: um 200 e um 409; inexistente 404', async () => {
    const org = await db.organizacao.findFirstOrThrow();
    const resultados = await Promise.all(['A', 'B'].map(enderecoCompleto => chamar(app, admin, 'PATCH', `/api/v1/organizacoes/${org.id}`, { versao: org.versao, enderecoCompleto })));
    expect(resultados.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect((await chamar(app, admin, 'PATCH', `/api/v1/organizacoes/${randomUUID()}`, { versao: 1, enderecoCompleto: 'A' })).statusCode).toBe(404);
  });
  test('contrato cria, persiste, renova apenas para data maior e protege versão', async () => {
    const org = await db.organizacao.findUniqueOrThrow({ where: { cnpj: '11444777000161' } });
    const dados = { dataAssinatura: new Date().toISOString(), dataVencimento: new Date(Date.now() + 86400000).toISOString(), clausulas: ['Coleta'], valorMensal: 100, renovacaoAutomatica: true };
    const r = await chamar(app, admin, 'PUT', `/api/v1/organizacoes/${org.id}/contrato`, dados); expect(r.statusCode).toBe(200); expect(r.json().vigente).toBe(true);
    const url = `/api/v1/organizacoes/${org.id}/contrato/renovar`;
    expect((await chamar(app, admin, 'POST', url, { versao: 1, novoVencimento: dados.dataVencimento })).statusCode).toBe(422);
    const novo = new Date(Date.now() + 2 * 86400000).toISOString();
    expect((await chamar(app, admin, 'POST', url, { versao: 1, novoVencimento: novo })).statusCode).toBe(200);
    expect((await chamar(app, admin, 'GET', `/api/v1/organizacoes/${org.id}/contrato`)).json().dataVencimento).toBe(novo);
    expect((await chamar(app, admin, 'PUT', `/api/v1/organizacoes/${org.id}/contrato`, { ...dados, versao: 1 })).statusCode).toBe(409);
  });
  test('transições concorrentes com mesma versão devolvem 200/409', async () => {
    const e = await primeiroEquipamento();
    const r = await Promise.all([1, 2].map(() => chamar(app, admin, 'PATCH', `/api/v1/equipamentos/${e.id}/status-rastreamento`, { versao: e.versao, novoStatus: 'EM_TRIAGEM' })));
    expect(r.map(item => item.statusCode).sort()).toEqual([200, 409]);
    expect((await chamar(app, admin, 'PATCH', `/api/v1/equipamentos/${e.id}/status-rastreamento`, { versao: e.versao, novoStatus: 'EM_TRIAGEM' })).statusCode).toBe(409);
  });
  test('centavos e pesos fracionários não sofrem erro de ponto flutuante na validação', async () => {
    const org = await db.organizacao.findUniqueOrThrow({ where: { cnpj: '11444777000161' } });
    const r = await chamar(app, admin, 'PUT', `/api/v1/organizacoes/${org.id}/contrato`, { dataAssinatura: new Date().toISOString(), dataVencimento: new Date(Date.now() + 86400000).toISOString(), clausulas: [], valorMensal: 0.29 });
    expect(r.statusCode).toBe(200); expect(r.json().valorMensal).toBe(0.29);
    const lote = await primeiroLote();
    const e = await chamar(app, admin, 'POST', `/api/v1/lotes/${lote.id}/equipamentos`, { ...equipamentoInput(), posicaoNoLote: 100, pesoQuilogramas: 1.001 });
    expect(e.statusCode).toBe(201); expect(e.json().pesoQuilogramas).toBe(1.001);
  });
  test('relatórios reais e auditoria paginada', async () => {
    const org = await db.organizacao.findUniqueOrThrow({ where: { cnpj: '12345678000195' } });
    const p = periodo();
    expect((await chamar(app, admin, 'GET', `/api/v1/relatorios/por-organizacao/${org.id}?${p}`)).json().length).toBeGreaterThan(0);
    expect((await chamar(app, admin, 'GET', '/api/v1/relatorios/por-status?status=RECEBIDO')).json()).toHaveLength(1);
    expect((await chamar(app, admin, 'GET', `/api/v1/relatorios/financeiro?${p}`)).json().valorFinanceiro).toBe(450);
    expect((await chamar(app, admin, 'GET', `/api/v1/relatorios/resumo?${p}`)).json()).toEqual({ totalLotes: 5, totalOrganizacoes: 3, valorFinanceiro: 450 });
    await chamar(app, admin, 'POST', '/api/v1/auth/logout');
    const j = await chamar(app, admin, 'GET', '/api/v1/auditoria/journal?entidade=Usuario&usuario=admin&pageSize=1'); expect(j.json().total).toBe(1);
  });
  test('jornada completa: org -> contrato -> lote -> triagem -> desmonte -> baixa -> relatórios', async () => {
    await limpar();
    const { hash } = await import('bcryptjs');
    const u = await db.usuario.create({ data: { usuario: 'admin', hashSenha: await hash(senhaAdmin, 10), papel: 'ADMINISTRADOR' } });
    admin = app.jwt.sign({ sub: u.id, usuario: u.usuario, papel: u.papel });
    const orgR = await chamar(app, admin, 'POST', '/api/v1/organizacoes', organizacaoInput); expect(orgR.statusCode).toBe(201); const org = orgR.json();
    expect((await chamar(app, admin, 'PUT', `/api/v1/organizacoes/${org.id}/contrato`, { dataAssinatura: new Date().toISOString(), dataVencimento: new Date(Date.now() + 86400000).toISOString(), valorMensal: 250, clausulas: ['Coleta'] })).statusCode).toBe(200);
    const loteR = await chamar(app, admin, 'POST', '/api/v1/lotes', { organizacaoId: org.id, notaFiscal: 'NF-JORNADA', transportadora: 'T', equipamentos: [equipamentoInput()] }); expect(loteR.statusCode).toBe(201); const lote = loteR.json();
    expect((await chamar(app, admin, 'GET', `/api/v1/lotes/${lote.id}`)).json().pesoTotal).toBe(2.5);
    for (const [acao, versao] of [['iniciar', 1], ['concluir', 2]]) expect((await chamar(app, admin, 'POST', `/api/v1/lotes/${lote.id}/triagem/${acao}`, { versao })).statusCode).toBe(200);
    let versaoEquip = 1;
    for (const novoStatus of ['EM_TRIAGEM', 'AGUARDANDO_DESMONTE', 'EM_DESMONTE', 'DESCARTE_SEGURO', 'BAIXA_DEFINITIVA']) expect((await chamar(app, admin, 'PATCH', `/api/v1/equipamentos/${lote.equipamentos[0].id}/status-rastreamento`, { versao: versaoEquip++, novoStatus })).statusCode).toBe(200);
    for (const [status, versao] of [['ENCAMINHADO', 3], ['FINALIZADO', 4]]) expect((await chamar(app, admin, 'PATCH', `/api/v1/lotes/${lote.id}/status`, { status, versao })).statusCode).toBe(200);
    expect((await chamar(app, admin, 'GET', `/api/v1/equipamentos/${lote.equipamentos[0].id}/rastreio`)).json().totalMovimentacoes).toBe(6);
    expect((await chamar(app, admin, 'GET', `/api/v1/relatorios/financeiro?${periodo()}`)).json().valorFinanceiro).toBe(250);
    expect((await chamar(app, admin, 'POST', `/api/v1/organizacoes/${org.id}/desativar`, { versao: 1 })).json().ativo).toBe(false);
  });
});
