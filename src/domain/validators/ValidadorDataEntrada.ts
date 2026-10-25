import { Validador } from './Validador';

export class ValidadorDataEntrada extends Validador {
  validar(data: Date): boolean {
    const hoje = new Date();
    const dataInformada = new Date(data);

    if (Number.isNaN(dataInformada.getTime())) {
      this.mensagemErro = 'Data inválida.';
      return false;
    }

    if (dataInformada > hoje) {
      this.mensagemErro = 'Data de entrada não pode ser no futuro.';
      return false;
    }

    const diffDias = (hoje.getTime() - dataInformada.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDias > 90) {
      this.mensagemErro = 'Data de entrada anterior a mais de 90 dias.';
      return false;
    }

    return true;
  }
}
