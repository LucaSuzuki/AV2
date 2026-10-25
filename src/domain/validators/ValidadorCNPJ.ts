import { Validador } from './Validador';

export class ValidadorCNPJ extends Validador {
  validar(cnpj: string): boolean {
    const cnpjLimpo = (cnpj ?? '').replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      this.mensagemErro = 'CNPJ deve possuir 14 dígitos.';
      return false;
    }

    if (/^(\d)\1+$/.test(cnpjLimpo)) {
      this.mensagemErro = 'CNPJ inválido.';
      return false;
    }

    const calcularDigito = (base: string, pesos: number[]): number => {
      let soma = 0;
      for (let i = 0; i < base.length; i += 1) {
        soma += Number(base.charAt(i)) * pesos[i];
      }
      const resto = soma % 11;
      const digito = resto < 2 ? 0 : 11 - resto;
      return digito;
    };

    const parteBase = cnpjLimpo.slice(0, 12);
    const digito1 = calcularDigito(parteBase, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const digito2 = calcularDigito(`${parteBase}${digito1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    const resultado = cnpjLimpo === `${parteBase}${digito1}${digito2}`;
    this.mensagemErro = resultado ? 'CNPJ válido.' : 'CNPJ inválido pela regra do módulo 11.';
    return resultado;
  }
}
