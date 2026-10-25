export class AppError extends Error {
  constructor(public statusCode: number, public codigo: string, message: string, public details: unknown[] = []) { super(message); }
}
export class NaoEncontradoError extends AppError { constructor(message = 'Registro não encontrado.') { super(404, 'NAO_ENCONTRADO', message); } }
export class ConflitoError extends AppError { constructor(message = 'Registro duplicado ou versão defasada.') { super(409, 'CONFLITO', message); } }
export class RegraNegocioError extends AppError { constructor(message: string) { super(422, 'REGRA_NEGOCIO', message); } }
export class NaoAutorizadoError extends AppError { constructor(message = 'Credenciais invalidas') { super(401, 'NAO_AUTORIZADO', message); } }
export class ProibidoError extends AppError { constructor() { super(403, 'PROIBIDO', 'Papel sem permissão para esta operação.'); } }
export function conferirVersao(atual: number, esperada: number) {
  if (atual !== esperada) throw new ConflitoError('Versão defasada. Recarregue o registro.');
}
