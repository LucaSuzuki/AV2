import { FastifyInstance } from 'fastify';
import { AppError } from '../shared/errors';

export function registrarErros(app: FastifyInstance) {
  app.setErrorHandler((error: any, request, reply) => {
    let statusCode = 500, codigo = 'ERRO_INTERNO', message = 'Erro interno do servidor.';
    let details: unknown[] = [];
    if (error instanceof AppError) { statusCode = error.statusCode; codigo = error.codigo; message = error.message; details = error.details; }
    else if (error.validation) { statusCode = 400; codigo = 'VALIDACAO'; message = 'Requisição inválida.'; details = error.validation; }
    else if (error.code === 'P2002') { statusCode = 409; codigo = 'CONFLITO'; message = 'Registro duplicado.'; }
    else if (error.code === 'P2025') { statusCode = 404; codigo = 'NAO_ENCONTRADO'; message = 'Registro não encontrado.'; }
    else if (error.code === 'P2003' || error.code === 'P2004') { statusCode = 422; codigo = 'REGRA_NEGOCIO'; message = 'Violação de integridade dos dados.'; }
    else if (error.code === 'P2034') { statusCode = 409; codigo = 'CONFLITO'; message = 'Conflito concorrente; tente novamente.'; }
    else if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      statusCode = error.statusCode; codigo = `HTTP_${statusCode}`; message = statusCode === 401 ? 'Token ausente, inválido ou expirado.' : error.message;
    }
    if (statusCode === 500) request.log.error({ err: error, requestId: request.id }, 'Falha inesperada');
    reply.code(statusCode).send({ statusCode, error: codigo, message, details, ...(statusCode === 500 ? { requestId: request.id } : {}) });
  });
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ statusCode: 404, error: 'NAO_ENCONTRADO', message: 'Rota não encontrada.', details: [] }));
}
