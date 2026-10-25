export abstract class Validador {
  protected mensagemErro = 'Dados inválidos.';

  abstract validar(objeto: any): boolean;

  obterMensagemErro(): string {
    return this.mensagemErro;
  }
}
