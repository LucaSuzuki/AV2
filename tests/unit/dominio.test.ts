import { ValidadorCNPJ } from '../../src/domain/validators/ValidadorCNPJ';
import { ValidadorDataEntrada } from '../../src/domain/validators/ValidadorDataEntrada';
import { transicoesLote, transicoesRastreamento, validarTransicao, validarEstadoFisico } from '../../src/domain/regras/transicoes';

describe('Regras preservadas do AV1', () => {
  test.each(['12345678000195', '11222333000181', '11444777000161', '45723174000110'])('CNPJ válido %s', cnpj => expect(new ValidadorCNPJ().validar(cnpj)).toBe(true));
  test.each(['11111111111111', '123', '12345678000196'])('CNPJ inválido %s', cnpj => expect(new ValidadorCNPJ().validar(cnpj)).toBe(false));
  test.each([1, -91])('Data rejeitada: %i dias', dias => expect(new ValidadorDataEntrada().validar(new Date(Date.now() + dias * 86400000))).toBe(false));
  test('Data válida', () => expect(new ValidadorDataEntrada().validar(new Date(Date.now() - 86400000))).toBe(true));
  test('R3 exige justificativa', () => { expect(() => validarEstadoFisico(0, 2)).toThrow(); expect(() => validarEstadoFisico(0, 2, 'Avaria constatada')).not.toThrow(); });
  test.each([transicoesLote, transicoesRastreamento])('Mapas aceitam apenas avanços previstos', mapa => {
    for (const [origem, destinos] of Object.entries(mapa)) {
      for (const destino of destinos) expect(() => validarTransicao(mapa, origem, destino)).not.toThrow();
      expect(() => validarTransicao(mapa, origem, origem)).toThrow();
      expect(() => validarTransicao(mapa, origem, 'INVENTADO')).toThrow();
    }
  });
});
