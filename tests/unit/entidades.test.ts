import { Contrato } from '../../src/domain/entidades/Contrato';
import { Equipamento } from '../../src/domain/entidades/Equipamento';
import { Lote } from '../../src/domain/entidades/Lote';
import { TipoEquipamento, EstadoFisico, StatusRastreamento } from '../../src/domain/enums';
import { lerEnv } from '../../src/config/env';

function equipamento(peso = 2.5) { return new Equipamento({ id: 'eq-1', codigoBarrasInterno: 'CB-1', tipo: TipoEquipamento.NOTEBOOK, marca: 'Dell', modelo: 'Latitude', anoFabricacao: 2020, estadoFisico: EstadoFisico.BOM_ESTADO, pesoQuilogramas: peso, loteId: 'lote-1', posicaoNoLote: 1, statusRastreamento: StatusRastreamento.AGUARDANDO_TRIAGEM }); }
test('entidade preserva estado anterior e ator no histórico', () => {
  const e = equipamento();
  expect(() => e.atualizarStatus(EstadoFisico.INSERVIVEL, '', 'operador')).toThrow();
  e.atualizarStatus(EstadoFisico.INSERVIVEL, 'Equipamento quebrado', 'operador');
  expect(e.historicoMovimentacao[0]).toMatchObject({ origem: '1', destino: '6', responsavel: 'operador' });
});
test('depreciação mantém cálculo e limites do AV1', () => {
  const e = equipamento();
  expect(e.calcularDepreciacao()).toBe(Math.max(0, 100 - (new Date().getFullYear() - 2020) * 5 - 4));
  e.anoFabricacao = 1950; expect(e.calcularDepreciacao()).toBe(0);
  e.anoFabricacao = new Date().getFullYear(); e.estadoFisico = 0; expect(e.calcularDepreciacao()).toBe(100);
});
test('lote calcula peso', () => {
  const l = new Lote({ id: 'lote-1', dataEntrada: new Date(), organizacaoId: 'org-1', notaFiscal: 'NF', transportadora: 'T', equipamentos: [equipamento(), equipamento(3)] });
  expect(l.calcularPesoTotal()).toBe(5.5); expect(l.gerarRelatorioTriagem()).toContain('2 equipamentos');
});
test('contrato verifica vigência e só aumenta vencimento', () => {
  const c = new Contrato({ id: 'c-1', organizacaoId: 'org-1', dataAssinatura: new Date(Date.now() - 86400000), dataVencimento: new Date(Date.now() + 86400000), valorMensal: 150 });
  expect(c.estaVigente()).toBe(true); expect(() => c.renovar(new Date(Date.now() - 86400000))).toThrow();
  c.renovar(new Date(Date.now() + 2 * 86400000)); expect(c.estaVigente()).toBe(true);
});
test('configuração rejeita banco/segredo ausentes e valores inválidos', () => {
  expect(() => lerEnv({})).toThrow('DATABASE_URL');
  expect(() => lerEnv({ DATABASE_URL: 'postgresql://localhost/db' })).toThrow('JWT_SECRET');
  const base = { DATABASE_URL: 'postgresql://localhost/db', JWT_SECRET: 'a'.repeat(32) };
  expect(() => lerEnv({ ...base, PORT: 'abc' })).toThrow('PORT');
  expect(() => lerEnv({ ...base, JWT_EXPIRES_IN: '1d' })).toThrow('30m');
});
